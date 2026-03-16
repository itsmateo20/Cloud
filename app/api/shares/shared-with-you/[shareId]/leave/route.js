import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ensureShareTables, removeViewerFromShare } from "@/lib/shares";

export async function POST(_req, { params }) {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    const { shareId } = await params;
    const viewerEmail = String(session.user.email || session.user.googleEmail || "").trim().toLowerCase();
    if (!viewerEmail) {
        return NextResponse.json({ success: false, code: "email_required", message: "No account email available" }, { status: 400 });
    }

    try {
        await ensureShareTables();
        const result = await removeViewerFromShare(shareId, viewerEmail);

        if (!result.ok) {
            if (result.code === "share_not_found") {
                return NextResponse.json({ success: false, code: result.code, message: "Share not found" }, { status: 404 });
            }
            if (result.code === "not_shared_with_user") {
                return NextResponse.json({ success: false, code: result.code, message: "This share is not assigned to your email" }, { status: 403 });
            }
            return NextResponse.json({ success: false, code: result.code, message: "Failed to leave share" }, { status: 400 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch {
        return NextResponse.json({ success: false, code: "shared_with_you_leave_failed", message: "Failed to leave share" }, { status: 500 });
    }
}
