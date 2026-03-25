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

        const adminUserId = session.user.impersonatorId;
        if (!adminUserId) {
            return NextResponse.json({ success: false, code: "not_impersonating", message: "Session is not impersonating" }, { status: 400 });
        }

        const adminUser = await prisma.user.findUnique({
            where: { id: adminUserId },
            select: { id: true, email: true, googleEmail: true, provider: true, admin: true }
        });

        if (!adminUser || !adminUser.admin) {
            return NextResponse.json({ success: false, code: "admin_not_found", message: "Admin account not found" }, { status: 404 });
        }

        await createSession({
            id: adminUser.id,
            email: adminUser.email,
            googleEmail: adminUser.googleEmail,
            provider: adminUser.provider,
            admin: true,
            impersonatorId: null,
        }, req);

        return NextResponse.json({ success: true, user: { ...adminUser, impersonatorId: null } });
    } catch {
        return NextResponse.json({ success: false, code: "impersonation_stop_failed", message: "Failed to restore admin session" }, { status: 500 });
    }
}
