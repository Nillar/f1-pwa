import { prisma } from "@/lib/prisma";

export async function findUserByToken(clientToken: string | null) {
    if (!clientToken) {
        return null;
    }

    return prisma.user.findUnique({
        where: {
            clientToken,
        },
    });
}
