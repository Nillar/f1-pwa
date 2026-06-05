import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

export const runtime = "nodejs";

const TEST_NOTIFICATION_DELAY_MS = 10_000;

const globalForTestNotifications = globalThis as typeof globalThis & {
    scheduledTestNotifications?: Map<string, ReturnType<typeof setTimeout>>;
};

const scheduledTestNotifications =
    globalForTestNotifications.scheduledTestNotifications ?? new Map();

if (!globalForTestNotifications.scheduledTestNotifications) {
    globalForTestNotifications.scheduledTestNotifications = scheduledTestNotifications;
}

type TestNotificationResponse = {
    error?: string;
    mode?: "immediate" | "scheduled";
    scheduledFor?: string;
};

export async function POST(req: Request) {
    try {
        const user = await getSession();
        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const delaySeconds =
            typeof body?.delaySeconds === "number" && body.delaySeconds >= 0
                ? body.delaySeconds
                : TEST_NOTIFICATION_DELAY_MS / 1000;

        const subscription = await prisma.pushSubscription.findFirst({
            where: { userId: user.id },
            orderBy: { updatedAt: "desc" },
        });

        if (!subscription) {
            return Response.json(
                { error: "No push subscription found. Enable push notifications first." },
                { status: 404 }
            );
        }

        const existingSchedule = scheduledTestNotifications.get(subscription.id);
        if (existingSchedule) {
            clearTimeout(existingSchedule);
        }

        const delayMs = delaySeconds * 1000;
        const scheduledFor = new Date(Date.now() + delayMs);

        const payload = {
            title: "F1 test notification",
            body:
                delaySeconds === 0
                    ? "This push was sent immediately from the notification dashboard."
                    : `This push was scheduled ${delaySeconds} seconds ago from the notification dashboard.`,
            tag: "f1-test-notification",
            url: "/notifications-dashboard",
        };

        if (delayMs === 0) {
            await sendPushNotification(subscription, payload);
            return Response.json({
                ok: true,
                mode: "immediate",
                scheduledFor: scheduledFor.toISOString(),
            });
        }

        const timeoutHandle = setTimeout(async () => {
            try {
                await sendPushNotification(subscription, payload);
            } catch (error) {
                console.error("Failed to send test notification", error);
                if (
                    typeof error === "object" &&
                    error !== null &&
                    "statusCode" in error &&
                    (error.statusCode === 404 || error.statusCode === 410)
                ) {
                    await prisma.pushSubscription.deleteMany({
                        where: { endpoint: subscription.endpoint },
                    });
                }
            } finally {
                scheduledTestNotifications.delete(subscription.id);
            }
        }, delayMs);

        scheduledTestNotifications.set(subscription.id, timeoutHandle);

        return Response.json({
            ok: true,
            mode: "scheduled",
            scheduledFor: scheduledFor.toISOString(),
        });
    } catch (error) {
        console.error("Failed to schedule test notification", error);
        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to schedule test notification",
            },
            { status: 500 }
        );
    }
}
