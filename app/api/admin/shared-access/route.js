import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ensureAdminSession } from "@/lib/adminAuth";
import { getSession } from "@/lib/session";
import { ensureSharedAccessTables } from "@/lib/sharedAccess";

export async function GET() {
    const check = await ensureAdminSession(await getSession());
    if (!check.success) return NextResponse.json(check.response, { status: check.status });

    try {
        await ensureSharedAccessTables();
        const shares = await prisma.$queryRawUnsafe(`
            SELECT s.id, s.ownerId, s.folderPath, s.name, s.allowedEmails, s.createdAt, s.updatedAt,
                   COALESCE(u.email, u.googleEmail, u.githubEmail, u.discordEmail, '') AS ownerEmail,
                   CAST((SELECT COUNT(*) FROM SharedAccessMember m WHERE m.shareId = s.id) AS TEXT) AS memberCount
            FROM SharedAccessFolder s
            LEFT JOIN User u ON u.id = s.ownerId
            ORDER BY s.updatedAt DESC
        `);
        return NextResponse.json({ success: true, shares });
    } catch {
        return NextResponse.json({ success: false, code: "admin_shared_access_failed", message: "Failed to load shared access folders" }, { status: 500 });
    }
}
