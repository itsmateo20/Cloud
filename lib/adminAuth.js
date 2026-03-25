import prisma from "@/lib/db";

export function isAdminSession(session) {
    return Boolean(session?.success && session?.user?.admin === true);
}

export function parseUserId(input) {
    const id = Number(input);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export async function ensureAdminSession(session) {
    if (!isAdminSession(session)) {
        return { success: false, status: 403, response: { success: false, code: "admin_required", message: "Admin access required" } };
    }

    return { success: true };
}

export async function getUserForAdmin(userId) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            googleEmail: true,
            provider: true,
            admin: true,
            createdAt: true,
            updatedAt: true,
            settings: true,
        }
    });
}
