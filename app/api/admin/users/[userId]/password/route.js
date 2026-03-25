import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureAdminSession, parseUserId, getUserForAdmin } from "@/lib/adminAuth";

function meetsPasswordRequirements(password) {
    return /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password) &&
        password.length >= 8;
}

export async function POST(req, context) {
    try {
        const session = await getSession();
        const adminCheck = await ensureAdminSession(session);
        if (!adminCheck.success) {
            return NextResponse.json(adminCheck.response, { status: adminCheck.status });
        }

        const params = await context.params;
        const userId = parseUserId(params?.userId);
        if (!userId) {
            return NextResponse.json({ success: false, code: "invalid_user_id", message: "Invalid user id" }, { status: 400 });
        }

        const targetUser = await getUserForAdmin(userId);
        if (!targetUser) {
            return NextResponse.json({ success: false, code: "user_not_found", message: "User not found" }, { status: 404 });
        }

        const { password } = await req.json();
        if (!password || !meetsPasswordRequirements(password)) {
            return NextResponse.json({ success: false, code: "password_requirements_false", message: "Password does not meet requirements" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        return NextResponse.json({ success: true, message: "Password updated" });
    } catch {
        return NextResponse.json({ success: false, code: "admin_user_password_update_failed", message: "Failed to update password" }, { status: 500 });
    }
}
