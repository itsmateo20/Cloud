// app/api/shares/[shareId]/logs/route.js

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/db";
import { ensureShareTables, listShareLogsByOwner } from "@/lib/shares";

export async function GET(req, { params }) {
    const { shareId } = await params;
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    try {
        await ensureShareTables();
        const url = new URL(req.url);
        const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") || 200)));
        const logs = await listShareLogsByOwner(session.user.id, shareId, limit);
        return NextResponse.json({ success: true, logs }, { status: 200 });
    } catch {
        return NextResponse.json({ success: false, code: "share_logs_failed", message: "Failed to load logs" }, { status: 500 });
    }
}

export async function DELETE(_req, { params }) {
    const { shareId } = await params;
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    try {
        await ensureShareTables();
        await listShareLogsByOwner(session.user.id, shareId, 1);

        await prisma.$executeRawUnsafe(
            `DELETE FROM SharedCollectionAccessLog
             WHERE shareId = ? AND shareId IN (
                SELECT id FROM SharedCollection WHERE ownerId = ?
             )`,
            Number(shareId),
            Number(session.user.id)
        );

        return NextResponse.json({ success: true }, { status: 200 });
    } catch {
        return NextResponse.json({ success: false, code: "share_logs_clear_failed", message: "Failed to clear logs" }, { status: 500 });
    }
}
