import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, createSession } from "@/lib/session";
import { ensureAdminSession } from "@/lib/adminAuth";

export async function POST(req) {
    try {
        const session = await getSession();
        const adminCheck = await ensureAdminSession(session);
        if (!adminCheck.success) {
            return NextResponse.json(adminCheck.response, { status: adminCheck.status });
        }

        const { userId } = await req.json();
        const parsedUserId = Number(userId);
        if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
            return NextResponse.json({ success: false, code: "invalid_user_id", message: "Invalid user id" }, { status: 400 });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: parsedUserId },
            select: { id: true, email: true, googleEmail: true, provider: true, admin: true }
        });

        if (!targetUser) {
            return NextResponse.json({ success: false, code: "user_not_found", message: "User not found" }, { status: 404 });
        }

        const impersonatorId = session.user.impersonatorId || session.user.id;

        await createSession({
            id: targetUser.id,
            email: targetUser.email,
            googleEmail: targetUser.googleEmail,
            provider: targetUser.provider,
            admin: true,
            impersonatorId,
        }, req);

        return NextResponse.json({ success: true, user: { ...targetUser, admin: true, impersonatorId } });
    } catch {
        return NextResponse.json({ success: false, code: "impersonation_failed", message: "Failed to impersonate user" }, { status: 500 });
    }
}
