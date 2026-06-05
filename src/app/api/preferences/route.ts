import {
    buildPreferencesPayload,
    normalizeRacePreferenceInput,
    normalizeSessionPreferences,
    PreferencesValidationError,
    type RacePreferenceInput,
    type SessionPreferenceInput,
} from "@/lib/preferences";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function replaceSessionPreferences(
    userId: string,
    scope: "GLOBAL" | "RACE",
    meetingId: string,
    preferences: SessionPreferenceInput[]
) {
    await prisma.$transaction(async (tx) => {
        const existingPreferences = await tx.sessionPreference.findMany({
            where: { userId, scope, meetingId },
            select: { id: true },
        });

        if (existingPreferences.length > 0) {
            await tx.reminder.deleteMany({
                where: {
                    sessionPreferenceId: {
                        in: existingPreferences.map((p) => p.id),
                    },
                },
            });
        }

        await tx.sessionPreference.deleteMany({ where: { userId, scope, meetingId } });

        for (const preference of preferences) {
            await tx.sessionPreference.create({
                data: {
                    userId,
                    scope,
                    meetingId,
                    sessionType: preference.sessionType,
                    reminders: {
                        create: preference.reminders.map((minutesBefore) => ({
                            minutesBefore,
                        })),
                    },
                },
            });
        }
    });
}

async function readPreferencesPayload(userId: string) {
    const [globalPreferences, raceSettings, raceSessionPreferences] = await Promise.all([
        prisma.sessionPreference.findMany({
            where: { userId, scope: "GLOBAL", meetingId: "" },
            include: { reminders: { orderBy: { minutesBefore: "desc" } } },
            orderBy: { sessionType: "asc" },
        }),
        prisma.racePreferenceSetting.findMany({
            where: { userId },
            orderBy: { meetingId: "asc" },
        }),
        prisma.sessionPreference.findMany({
            where: { userId, scope: "RACE" },
            include: { reminders: { orderBy: { minutesBefore: "desc" } } },
            orderBy: [{ meetingId: "asc" }, { sessionType: "asc" }],
        }),
    ]);

    const preferencesByMeetingId = new Map<string, typeof raceSessionPreferences>();

    for (const preference of raceSessionPreferences) {
        const existing = preferencesByMeetingId.get(preference.meetingId) ?? [];
        existing.push(preference);
        preferencesByMeetingId.set(preference.meetingId, existing);
    }

    return buildPreferencesPayload(globalPreferences, raceSettings, preferencesByMeetingId);
}

export async function GET() {
    const user = await getSession();
    if (!user) {
        return Response.json({ globalPreferences: [], racePreferences: [] });
    }
    return Response.json(await readPreferencesPayload(user.id));
}

export async function PUT(req: Request) {
    try {
        const user = await getSession();
        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const preferences = normalizeSessionPreferences(body?.preferences);

        await replaceSessionPreferences(user.id, "GLOBAL", "", preferences);

        return Response.json(await readPreferencesPayload(user.id));
    } catch (error) {
        if (error instanceof PreferencesValidationError) {
            return Response.json({ error: error.message }, { status: error.status });
        }
        console.error("Failed to save global preferences", error);
        return Response.json({ error: "Failed to save global preferences" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getSession();
        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const racePreference = normalizeRacePreferenceInput(body as RacePreferenceInput);

        await prisma.racePreferenceSetting.upsert({
            where: {
                user_meeting_setting_unique: {
                    userId: user.id,
                    meetingId: racePreference.meetingId,
                },
            },
            update: { notificationsEnabled: !racePreference.disableAll },
            create: {
                userId: user.id,
                meetingId: racePreference.meetingId,
                notificationsEnabled: !racePreference.disableAll,
            },
        });

        await replaceSessionPreferences(
            user.id,
            "RACE",
            racePreference.meetingId,
            racePreference.sessionPreferences
        );

        return Response.json(await readPreferencesPayload(user.id));
    } catch (error) {
        if (error instanceof PreferencesValidationError) {
            return Response.json({ error: error.message }, { status: error.status });
        }
        console.error("Failed to save race preferences", error);
        return Response.json({ error: "Failed to save race preferences" }, { status: 500 });
    }
}
