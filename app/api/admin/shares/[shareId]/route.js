// app/api/admin/shares/[shareId]/route.js

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ensureAdminSession } from "@/lib/adminAuth";
import {
    deleteShareByAdmin,
    ensureShareTables,
    getShareByAdmin,
    parseDurationToExpiresAt,
    updateShareByAdmin
} from "@/lib/shares";

export async function GET(_req, { params }) {
    const check = await ensureAdminSession(await getSession());
    if (!check.success) return NextResponse.json(check.response, { status: check.status });

    try {
        const { shareId } = await params;
        await ensureShareTables();
        const share = await getShareByAdmin(shareId);
        if (!share) return NextResponse.json({ success: false, code: "share_not_found", message: "Share not found" }, { status: 404 });
        return NextResponse.json({ success: true, share });
    } catch {
        return NextResponse.json({ success: false, code: "admin_share_get_failed", message: "Failed to load share link" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    const check = await ensureAdminSession(await getSession());
    if (!check.success) return NextResponse.json(check.response, { status: check.status });

    try {
        const { shareId } = await params;
        const body = await req.json();
        await ensureShareTables();
        const existing = await getShareByAdmin(shareId);
        if (!existing) return NextResponse.json({ success: false, code: "share_not_found", message: "Share not found" }, { status: 404 });

        const durationUnit = String(body.durationUnit || "").toLowerCase();
        let expiresAt = existing.expiresAt || null;
        if (durationUnit === "never") expiresAt = null;
        else if (body.expiresAt !== undefined) expiresAt = body.expiresAt || null;
        else if (body.durationValue !== undefined || body.durationUnit !== undefined) expiresAt = parseDurationToExpiresAt(body.durationValue, body.durationUnit);

        const share = await updateShareByAdmin(shareId, {
            name: String(body.name || existing.name || "Untitled Share").trim(),
            requireLogin: Boolean(body.requireLogin),
            allowedEmails: Array.isArray(body.allowedEmails) ? body.allowedEmails : existing.allowedEmails,
            passcode: body.passcode,
            clearPasscode: Boolean(body.clearPasscode),
            expiresAt
        });
        return NextResponse.json({ success: true, share });
    } catch {
        return NextResponse.json({ success: false, code: "admin_share_update_failed", message: "Failed to update share link" }, { status: 500 });
    }
}

export async function DELETE(_req, { params }) {
    const check = await ensureAdminSession(await getSession());
    if (!check.success) return NextResponse.json(check.response, { status: check.status });

    try {
        const { shareId } = await params;
        await ensureShareTables();
        const existing = await getShareByAdmin(shareId);
        if (!existing) return NextResponse.json({ success: false, code: "share_not_found", message: "Share not found" }, { status: 404 });
        await deleteShareByAdmin(shareId);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, code: "admin_share_delete_failed", message: "Failed to remove share link" }, { status: 500 });
    }
}
