import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;

    if (sessionId) {
        await prisma.session.deleteMany({ where: { id: sessionId } });
    }

    const response = NextResponse.redirect(new URL("/", req.url));
    response.cookies.delete("sessionId");

    return response;
}
