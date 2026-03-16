// app/api/shares/access/[token]/route.js

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canAccessShare, ensureShareTables, getShareByToken, logShareAccess } from "@/lib/shares";

function decodePasscodeFromQuery(url) {
    const encoded = url.searchParams.get("pc") || "";
    if (encoded) {
        try {
            const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
            const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
            const binary = atob(padded);
            const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
            return new TextDecoder().decode(bytes);
        } catch {
        }
    }

    return url.searchParams.get("passcode") || "";
}

export async function GET(req, { params }) {
    try {
        const { token } = await params;
        const url = new URL(req.url);
        const passcode = decodePasscodeFromQuery(url);

        await ensureShareTables();
        const share = await getShareByToken(token);
        const session = await getSession();
        const access = canAccessShare(share, session, passcode);

        const viewerEmail = session?.user ? String(session.user.email || session.user.googleEmail || "") : null;
        const viewerUserId = session?.user?.id ?? null;
        const ipAddress = req.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() || null;
        const userAgent = req.headers.get("user-agent") || null;

        if (share?.id) {
            await logShareAccess({
                shareId: share.id,
                action: "view_share",
                outcome: access.ok ? "success" : access.code,
                viewerEmail,
                viewerUserId,
                ipAddress,
                userAgent
            });
        }

        if (!access.ok) {
            return NextResponse.json({ success: false, code: access.code, message: access.message }, { status: access.status });
        }

        return NextResponse.json({
            success: true,
            share: {
                id: share.id,
                token: share.token,
                name: share.name,
                requireLogin: share.requireLogin,
                allowedEmails: share.allowedEmails,
                expiresAt: share.expiresAt,
                createdAt: share.createdAt,
                ownerId: share.ownerId,
                items: share.items
            }
        }, { status: 200 });
    } catch {
        return NextResponse.json({ success: false, code: "share_access_failed", message: "Failed to load share" }, { status: 500 });
    }
}
