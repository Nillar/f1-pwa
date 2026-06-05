import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const user = await getSession();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const channel = await prisma.notificationChannel.findUnique({
        where: { userId: user.id },
    });

    return Response.json({
        pushEnabled: channel?.pushEnabled ?? true,
        emailEnabled: channel?.emailEnabled ?? false,
    });
}

export async function PATCH(req: Request) {
    const user = await getSession();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const pushEnabled =
        typeof body?.pushEnabled === "boolean" ? body.pushEnabled : undefined;
    const emailEnabled =
        typeof body?.emailEnabled === "boolean" ? body.emailEnabled : undefined;

    if (pushEnabled === undefined && emailEnabled === undefined) {
        return Response.json(
            { error: "pushEnabled or emailEnabled required" },
            { status: 400 }
        );
    }

    const channel = await prisma.notificationChannel.upsert({
        where: { userId: user.id },
        update: {
            ...(pushEnabled !== undefined && { pushEnabled }),
            ...(emailEnabled !== undefined && { emailEnabled }),
        },
        create: {
            userId: user.id,
            pushEnabled: pushEnabled ?? true,
            emailEnabled: emailEnabled ?? false,
        },
    });

    return Response.json({
        pushEnabled: channel.pushEnabled,
        emailEnabled: channel.emailEnabled,
    });
}
