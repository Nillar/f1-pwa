import { Prisma } from "@prisma/client";

import {
    getCalendarMeetings,
    type CalendarMeeting,
    type CalendarSession,
} from "@/lib/calendar";
import { sendReminderEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";
import { formatReminder } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type StoredSubscription = {
    auth: string;
    endpoint: string;
    id: string;
    p256dh: string;
};

type SendStats = {
    checkedUsers: number;
    dueReminderRules: number;
    emailFailed: number;
    emailSent: number;
    failed: number;
    pushSent: number;
    removedSubscriptions: number;
    skippedDuplicates: number;
};

function isAuthorizedCronRequest(req: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return process.env.NODE_ENV !== "production";
    return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

function isPrismaError(error: unknown, code: string) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === code
    );
}

function getPushStatusCode(error: unknown) {
    if (typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number") {
        return error.statusCode;
    }
    return null;
}

function isExpiredPushSubscription(error: unknown) {
    const statusCode = getPushStatusCode(error);
    return statusCode === 404 || statusCode === 410;
}

function getPreferenceKey(meetingId: string, sessionType: string) {
    return `${meetingId}:${sessionType}`;
}

function getUtcDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
}

function getReminderDateKey(sessionStartTime: Date, minutesBefore: number) {
    return getUtcDateKey(new Date(sessionStartTime.getTime() - minutesBefore * 60 * 1000));
}

function isReminderDueToday(sessionStartTime: Date, minutesBefore: number, todayUtcDateKey: string) {
    return getReminderDateKey(sessionStartTime, minutesBefore) === todayUtcDateKey;
}

function formatSessionStartTime(sessionStartTime: Date, timeZone: string) {
    return new Intl.DateTimeFormat("en", {
        day: "numeric",
        hour: "2-digit",
        hour12: false,
        minute: "2-digit",
        month: "short",
        timeZone,
        timeZoneName: "short",
        weekday: "long",
    }).format(sessionStartTime);
}

function buildPushPayload(
    timeZone: string,
    meeting: CalendarMeeting,
    session: CalendarSession,
    minutesBefore: number
) {
    const reminderLabel = formatReminder(minutesBefore);
    const sessionStartTime = new Date(session.startTime);
    return {
        title: `F1 Reminder: ${session.name}`,
        body: `${meeting.name} ${session.name} starts ${formatSessionStartTime(sessionStartTime, timeZone)}. This is your ${reminderLabel} reminder.`,
        tag: `f1-${meeting.id}-${session.id}-${minutesBefore}`,
        url: "/",
    };
}

async function createSentNotification(
    subscription: StoredSubscription,
    meeting: CalendarMeeting,
    session: CalendarSession,
    sessionStartTime: Date,
    minutesBefore: number
) {
    try {
        return await prisma.sentNotification.create({
            data: {
                pushSubscriptionId: subscription.id,
                meetingId: meeting.id,
                sessionType: session.name,
                sessionStartTime,
                minutesBefore,
            },
        });
    } catch (error) {
        if (isPrismaError(error, "P2002")) return null;
        throw error;
    }
}

async function createEmailNotification(
    userId: string,
    meeting: CalendarMeeting,
    session: CalendarSession,
    sessionStartTime: Date,
    minutesBefore: number
) {
    try {
        return await prisma.emailNotification.create({
            data: {
                userId,
                meetingId: meeting.id,
                sessionType: session.name,
                sessionStartTime,
                minutesBefore,
            },
        });
    } catch (error) {
        if (isPrismaError(error, "P2002")) return null;
        throw error;
    }
}

export async function GET(req: Request) {
    if (!isAuthorizedCronRequest(req)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayUtcDateKey = getUtcDateKey(now);
    const nextUtcDateKey = getUtcDateKey(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + MS_PER_DAY)
    );
    const meetings = getCalendarMeetings();
    const stats: SendStats = {
        checkedUsers: 0,
        dueReminderRules: 0,
        emailFailed: 0,
        emailSent: 0,
        failed: 0,
        pushSent: 0,
        removedSubscriptions: 0,
        skippedDuplicates: 0,
    };
    const removedSubscriptionIds = new Set<string>();

    const users = await prisma.user.findMany({
        where: {
            sessionPreferences: { some: {} },
        },
        include: {
            racePreferenceSettings: true,
            sessionPreferences: {
                include: { reminders: { orderBy: { minutesBefore: "desc" } } },
            },
            subscriptions: true,
            notificationChannel: true,
        },
    });

    stats.checkedUsers = users.length;

    for (const user of users) {
        const pushEnabled = user.notificationChannel?.pushEnabled ?? true;
        const emailEnabled = user.notificationChannel?.emailEnabled ?? false;

        const globalPreferences = new Map<string, number[]>();
        const racePreferences = new Map<string, number[]>();
        const raceSettings = new Map(
            user.racePreferenceSettings.map((s) => [s.meetingId, s.notificationsEnabled])
        );

        for (const preference of user.sessionPreferences) {
            const reminderMinutes = preference.reminders.map((r) => r.minutesBefore);
            if (preference.scope === "GLOBAL" && preference.meetingId === "") {
                globalPreferences.set(preference.sessionType, reminderMinutes);
            }
            if (preference.scope === "RACE") {
                racePreferences.set(
                    getPreferenceKey(preference.meetingId, preference.sessionType),
                    reminderMinutes
                );
            }
        }

        for (const meeting of meetings) {
            if (raceSettings.get(meeting.id) === false) continue;

            for (const session of meeting.sessions) {
                const sessionStartTime = new Date(session.startTime);
                if (Number.isNaN(sessionStartTime.getTime())) continue;

                const raceReminderMinutes = racePreferences.get(
                    getPreferenceKey(meeting.id, session.name)
                );
                const reminderMinutes =
                    raceReminderMinutes ?? globalPreferences.get(session.name) ?? [];

                for (const minutesBefore of reminderMinutes) {
                    if (!isReminderDueToday(sessionStartTime, minutesBefore, todayUtcDateKey)) {
                        continue;
                    }

                    stats.dueReminderRules += 1;

                    // Push channel
                    if (pushEnabled) {
                        for (const subscription of user.subscriptions) {
                            if (removedSubscriptionIds.has(subscription.id)) continue;

                            const sentNotification = await createSentNotification(
                                subscription, meeting, session, sessionStartTime, minutesBefore
                            );

                            if (!sentNotification) {
                                stats.skippedDuplicates += 1;
                                continue;
                            }

                            try {
                                await sendPushNotification(
                                    subscription,
                                    buildPushPayload(user.timeZone, meeting, session, minutesBefore)
                                );
                                stats.pushSent += 1;
                            } catch (error) {
                                stats.failed += 1;
                                console.error("Failed to send push notification", {
                                    error,
                                    meetingId: meeting.id,
                                    minutesBefore,
                                    pushSubscriptionId: subscription.id,
                                });

                                if (isExpiredPushSubscription(error)) {
                                    removedSubscriptionIds.add(subscription.id);
                                    stats.removedSubscriptions += 1;
                                    await prisma.pushSubscription.deleteMany({
                                        where: { endpoint: subscription.endpoint },
                                    });
                                } else {
                                    await prisma.sentNotification.deleteMany({
                                        where: { id: sentNotification.id },
                                    });
                                }
                            }
                        }
                    }

                    // Email channel
                    if (emailEnabled) {
                        const emailNotification = await createEmailNotification(
                            user.id, meeting, session, sessionStartTime, minutesBefore
                        );

                        if (!emailNotification) {
                            stats.skippedDuplicates += 1;
                            continue;
                        }

                        try {
                            await sendReminderEmail(user.email, {
                                raceName: meeting.name,
                                sessionName: session.name,
                                sessionStartFormatted: formatSessionStartTime(sessionStartTime, user.timeZone),
                                reminderLabel: formatReminder(minutesBefore),
                            });
                            stats.emailSent += 1;
                        } catch (error) {
                            stats.emailFailed += 1;
                            console.error("Failed to send reminder email", {
                                error,
                                meetingId: meeting.id,
                                minutesBefore,
                                userId: user.id,
                            });
                            await prisma.emailNotification.deleteMany({
                                where: { id: emailNotification.id },
                            });
                        }
                    }
                }
            }
        }
    }

    return Response.json({
        ok: true,
        stats,
        window: {
            endUtcDate: nextUtcDateKey,
            startUtcDate: todayUtcDateKey,
        },
    });
}
