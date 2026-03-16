import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ensureShareTables, listSharesForViewerEmail } from "@/lib/shares";

export async function GET() {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    const viewerEmail = String(session.user.email || session.user.googleEmail || "").trim().toLowerCase();
    if (!viewerEmail) {
        return NextResponse.json({ success: true, shares: [] }, { status: 200 });
    }

    try {
        await ensureShareTables();
        const shares = await listSharesForViewerEmail(viewerEmail);
        return NextResponse.json({ success: true, shares }, { status: 200 });
    } catch {
        return NextResponse.json({ success: false, code: "shared_with_you_list_failed", message: "Failed to load shares shared with you" }, { status: 500 });
    }
}
