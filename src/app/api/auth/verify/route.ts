import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.redirect(new URL("/?error=invalid_token", req.url));
    }

    const tokenRecord = await prisma.verificationToken.findFirst({
        where: {
            token,
            expiresAt: { gt: new Date() },
        },
    });

    if (!tokenRecord) {
        return NextResponse.redirect(new URL("/?error=expired_token", req.url));
    }

    await prisma.verificationToken.delete({ where: { id: tokenRecord.id } });

    const user = await prisma.user.findUnique({ where: { email: tokenRecord.email } });

    if (!user) {
        return NextResponse.redirect(new URL("/?error=user_not_found", req.url));
    }

    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const session = await prisma.session.create({
        data: { userId: user.id, expiresAt },
    });

    const response = NextResponse.redirect(new URL("/notifications-dashboard", req.url));
    response.cookies.set("sessionId", session.id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        expires: expiresAt,
        path: "/",
    });

    return response;
}
