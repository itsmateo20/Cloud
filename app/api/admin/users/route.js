import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureAdminSession } from "@/lib/adminAuth";

export async function GET() {
    try {
        const session = await getSession();
        const adminCheck = await ensureAdminSession(session);
        if (!adminCheck.success) {
            return NextResponse.json(adminCheck.response, { status: adminCheck.status });
        }

        const users = await prisma.user.findMany({
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                email: true,
                googleEmail: true,
                provider: true,
                admin: true,
                createdAt: true,
                updatedAt: true,
                settings: true,
            },
        });

        return NextResponse.json({ success: true, users });
    } catch (error) {
        return NextResponse.json({ success: false, code: "admin_users_failed", message: "Failed to load users" }, { status: 500 });
    }
}
