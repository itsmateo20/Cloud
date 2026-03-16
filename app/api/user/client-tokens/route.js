// app/api/user/client-tokens/route.js

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import {
    CLIENT_TOKEN_KIND,
    listClientTokens,
    revokeClientTokenRecord
} from "@/lib/clientTokens";

export async function GET() {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    const tokens = await listClientTokens(session.user.id, {
        kind: CLIENT_TOKEN_KIND.WEB_SESSION,
        includeRevoked: false
    });
    const sanitized = tokens.map(token => ({
        tokenId: token.tokenId,
        kind: token.kind,
        label: token.label,
        ipAddress: token.ipAddress,
        userAgent: token.userAgent,
        platform: token.platform,
        issuedAt: token.issuedAt,
        lastUsedAt: token.lastUsedAt,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt
    }));

    return NextResponse.json({
        success: true,
        tokens: sanitized
    });
}

export async function POST(req) {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false, code: "invalid_json" }, { status: 400 });
    }

    const action = String(body?.action || "").trim();

    const getActiveTokens = async () => {
        const tokens = await listClientTokens(session.user.id, {
            kind: CLIENT_TOKEN_KIND.WEB_SESSION,
            includeRevoked: false
        });

        return tokens.map(token => ({
            tokenId: token.tokenId,
            kind: token.kind,
            label: token.label,
            ipAddress: token.ipAddress,
            userAgent: token.userAgent,
            platform: token.platform,
            issuedAt: token.issuedAt,
            lastUsedAt: token.lastUsedAt,
            expiresAt: token.expiresAt,
            revokedAt: token.revokedAt
        }));
    };

    if (action === "revoke") {
        const tokenId = String(body?.tokenId || "").trim();
        if (!tokenId) return NextResponse.json({ success: false, code: "token_id_missing" }, { status: 400 });

        const revoked = await revokeClientTokenRecord(session.user.id, tokenId);
        if (!revoked) {
            return NextResponse.json({ success: false, code: "token_not_found" }, { status: 404 });
        }

        const knownEmails = [session.user.email, session.user.googleEmail]
            .map((value) => String(value || "").trim().toLowerCase())
            .filter(Boolean);

        if (knownEmails.length > 0 && global.io) {
            const users = await prisma.user.findMany({
                where: {
                    OR: knownEmails.flatMap((value) => [{ email: value }, { googleEmail: value }])
                },
                select: { id: true }
            });

            users.forEach((matchedUser) => {
                global.io?.to(`user:${matchedUser.id}`).emit("auth-token-recheck", {
                    reason: "token_revoked",
                    tokenId
                });
            });
        }

        const tokens = await getActiveTokens();

        return NextResponse.json({
            success: true,
            code: "token_revoked",
            tokenId,
            tokens
        });
    }

    if (action === "clear_revoked") {
        const cleared = await prisma.clientToken.deleteMany({
            where: {
                userId: Number(session.user.id),
                kind: CLIENT_TOKEN_KIND.WEB_SESSION,
                revokedAt: { not: null }
            }
        });

        const tokens = await getActiveTokens();

        return NextResponse.json({
            success: true,
            code: "revoked_tokens_cleared",
            clearedCount: cleared.count,
            tokens
        });
    }

    if (action === "revoke_all_other") {
        const currentTokenId = String(session.user?.tid || "").trim();
        if (!currentTokenId) {
            return NextResponse.json({ success: false, code: "current_token_missing" }, { status: 400 });
        }

        const revoked = await prisma.clientToken.updateMany({
            where: {
                userId: Number(session.user.id),
                kind: CLIENT_TOKEN_KIND.WEB_SESSION,
                revokedAt: null,
                tokenId: { not: currentTokenId }
            },
            data: {
                revokedAt: new Date()
            }
        });

        global.io?.to(`user:${session.user.id}`).emit("auth-token-recheck", {
            reason: "revoke_all_other",
            keepTokenId: currentTokenId
        });

        const tokens = await getActiveTokens();

        return NextResponse.json({
            success: true,
            code: "other_devices_revoked",
            revokedCount: revoked.count,
            tokens
        });
    }

    return NextResponse.json({ success: false, code: "invalid_action" }, { status: 400 });
}
