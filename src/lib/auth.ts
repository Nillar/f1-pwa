import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export async function getSession(): Promise<User | null> {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;

    if (!sessionId) return null;

    const session = await prisma.session.findFirst({
        where: {
            id: sessionId,
            expiresAt: { gt: new Date() },
        },
        include: { user: true },
    });

    return session?.user ?? null;
}
