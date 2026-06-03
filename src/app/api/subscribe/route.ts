import { prisma } from "@/lib/prisma";

function normalizeTimeZone(timeZone: unknown) {
    if (typeof timeZone !== "string" || timeZone.trim().length === 0) {
        return "UTC";
    }

    try {
        Intl.DateTimeFormat("en", { timeZone });
        return timeZone;
    } catch {
        return "UTC";
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const sub = body?.subscription;
        const timeZone = normalizeTimeZone(body?.timeZone);
        const userToken =
            typeof body?.userToken === "string" && body.userToken.trim().length > 0
                ? body.userToken
                : crypto.randomUUID();

        if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
            return Response.json(
                { error: "Invalid push subscription payload" },
                { status: 400 }
            );
        }

        const saved = await prisma.$transaction(async (tx) => {
            const user = await tx.user.upsert({
                where: {
                    clientToken: userToken,
                },
                update: {
                    timeZone,
                },
                create: {
                    clientToken: userToken,
                    timeZone,
                },
            });

            const subscription = await tx.pushSubscription.upsert({
                where: {
                    endpoint: sub.endpoint,
                },
                update: {
                    userId: user.id,
                    p256dh: sub.keys.p256dh,
                    auth: sub.keys.auth,
                },
                create: {
                    userId: user.id,
                    endpoint: sub.endpoint,
                    p256dh: sub.keys.p256dh,
                    auth: sub.keys.auth,
                },
            });

            return {
                subscriptionId: subscription.id,
                userToken: user.clientToken,
            };
        });

        return Response.json(saved);
    } catch (error) {
        console.error("Failed to save push subscription", error);

        return Response.json(
            { error: "Failed to save push subscription" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const endpoint =
            typeof body?.endpoint === "string" ? body.endpoint : null;

        if (!endpoint) {
            return Response.json(
                { error: "endpoint is required" },
                { status: 400 }
            );
        }

        await prisma.pushSubscription.deleteMany({
            where: {
                endpoint,
            },
        });

        return Response.json({ ok: true });
    } catch (error) {
        console.error("Failed to delete push subscription", error);

        return Response.json(
            { error: "Failed to delete push subscription" },
            { status: 500 }
        );
    }
}
