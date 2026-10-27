// app/api/admin/shares/route.js

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ensureAdminSession } from "@/lib/adminAuth";
import { ensureShareTables, listActiveSharesForAdmin } from "@/lib/shares";

export async function GET() {
    const check = await ensureAdminSession(await getSession());
    if (!check.success) return NextResponse.json(check.response, { status: check.status });

    try {
        await ensureShareTables();
        const shares = await listActiveSharesForAdmin();
        return NextResponse.json({ success: true, shares });
    } catch {
        return NextResponse.json({ success: false, code: "admin_shares_failed", message: "Failed to load share links" }, { status: 500 });
    }
}
