// app/api/shares/[shareId]/route.js

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
    deleteShareByOwner,
    ensureShareTables,
    getShareByOwner,
    parseDurationToExpiresAt,
    updateShareByOwner
} from "@/lib/shares";

export async function GET(_req, { params }) {
    const { shareId } = await params;
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    try {
        await ensureShareTables();
        const share = await getShareByOwner(session.user.id, shareId);
        if (!share) {
            return NextResponse.json({ success: false, code: "share_not_found", message: "Share not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, share }, { status: 200 });
    } catch {
        return NextResponse.json({ success: false, code: "share_get_failed", message: "Failed to get share" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    const { shareId } = await params;
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        await ensureShareTables();

        const existing = await getShareByOwner(session.user.id, shareId);
        if (!existing) {
            return NextResponse.json({ success: false, code: "share_not_found", message: "Share not found" }, { status: 404 });
        }

        const normalizedDurationUnit = String(body.durationUnit || "").toLowerCase();
        let expiresAt = existing.expiresAt || null;

        if (normalizedDurationUnit === "never") {
            expiresAt = null;
        } else if (body.expiresAt !== undefined) {
            expiresAt = body.expiresAt || null;
        } else if (body.durationValue !== undefined || body.durationUnit !== undefined) {
            expiresAt = parseDurationToExpiresAt(body.durationValue, body.durationUnit);
        }

        const updated = await updateShareByOwner(session.user.id, shareId, {
            name: String(body.name || existing.name || "Untitled Share").trim(),
            requireLogin: Boolean(body.requireLogin),
            allowedEmails: Array.isArray(body.allowedEmails) ? body.allowedEmails : existing.allowedEmails,
            passcode: body.passcode,
            clearPasscode: Boolean(body.clearPasscode),
            expiresAt
        });

        return NextResponse.json({ success: true, share: updated }, { status: 200 });
    } catch {
        return NextResponse.json({ success: false, code: "share_update_failed", message: "Failed to update share" }, { status: 500 });
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
        await deleteShareByOwner(session.user.id, shareId);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch {
        return NextResponse.json({ success: false, code: "share_delete_failed", message: "Failed to delete share" }, { status: 500 });
    }
}
