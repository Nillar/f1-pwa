import { getSession } from "@/lib/auth";
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
        const user = await getSession();
        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const sub = body?.subscription;
        const timeZone = normalizeTimeZone(body?.timeZone);

        if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
            return Response.json(
                { error: "Invalid push subscription payload" },
                { status: 400 }
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { timeZone },
        });

        await prisma.pushSubscription.upsert({
            where: { endpoint: sub.endpoint },
            update: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            create: {
                userId: user.id,
                endpoint: sub.endpoint,
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
            },
        });

        return Response.json({ ok: true });
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
            return Response.json({ error: "endpoint is required" }, { status: 400 });
        }

        await prisma.pushSubscription.deleteMany({ where: { endpoint } });

        return Response.json({ ok: true });
    } catch (error) {
        console.error("Failed to delete push subscription", error);
        return Response.json(
            { error: "Failed to delete push subscription" },
            { status: 500 }
        );
    }
}
