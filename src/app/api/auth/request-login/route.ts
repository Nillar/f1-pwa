import { prisma } from "@/lib/prisma";
import { sendMagicLink } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const email =
            typeof body?.email === "string" ? body.email.toLowerCase().trim() : null;

        if (!email || !email.includes("@")) {
            return Response.json({ error: "Valid email required" }, { status: 400 });
        }

        await prisma.user.upsert({
            where: { email },
            update: {},
            create: { email },
        });

        await prisma.verificationToken.deleteMany({ where: { email } });

        const tokenRecord = await prisma.verificationToken.create({
            data: {
                email,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const magicLink = `${appUrl}/api/auth/verify?token=${tokenRecord.token}`;

        await sendMagicLink(email, magicLink);

        return Response.json({ ok: true });
    } catch (error) {
        console.error("Failed to send magic link", error);
        return Response.json({ error: "Failed to send login email" }, { status: 500 });
    }
}
