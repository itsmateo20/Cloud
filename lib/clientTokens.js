// lib/clientTokens.js

import prisma from "@/lib/db";

export const CLIENT_TOKEN_KIND = {
    WEB_SESSION: "web_session"
};

function createTokenId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function extractRequestMeta(req) {
    if (!req) {
        return {
            ipAddress: "unknown",
            userAgent: "unknown",
            platform: "unknown"
        };
    }

    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const realIp = req.headers.get("x-real-ip") || "";
    const ipAddress = (forwardedFor.split(",")[0] || realIp || "unknown").trim();
    const userAgent = (req.headers.get("user-agent") || "unknown").slice(0, 512);
    const secUaPlatform = req.headers.get("sec-ch-ua-platform") || "";
    const platform = secUaPlatform.replaceAll('"', "").trim() || inferPlatformFromUserAgent(userAgent);

    return { ipAddress, userAgent, platform };
}

function inferPlatformFromUserAgent(userAgent) {
    const ua = String(userAgent || "").toLowerCase();
    if (ua.includes("windows")) return "windows";
    if (ua.includes("android")) return "android";
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "ios";
    if (ua.includes("mac os") || ua.includes("macintosh")) return "macos";
    if (ua.includes("linux")) return "linux";
    return "unknown";
}

export async function createClientTokenRecord(userId, input = {}) {
    const tokenId = createTokenId();

    const token = await prisma.clientToken.create({
        data: {
            userId: Number(userId),
            tokenId,
            kind: input.kind || CLIENT_TOKEN_KIND.WEB_SESSION,
            label: String(input.label || "").trim() || null,
            ipAddress: input.ipAddress || "unknown",
            userAgent: input.userAgent || "unknown",
            platform: input.platform || "unknown",
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            revokedAt: null
        }
    });

    return serializeToken(token);
}

export async function listClientTokens(userId, options = {}) {
    const kind = options.kind || null;
    const includeRevoked = Boolean(options.includeRevoked);

    const tokens = await prisma.clientToken.findMany({
        where: {
            userId: Number(userId),
            ...(includeRevoked ? {} : { revokedAt: null }),
            ...(kind ? { kind } : {})
        },
        orderBy: [{ lastUsedAt: "desc" }, { issuedAt: "desc" }]
    });

    return tokens.map(serializeToken);
}

export async function getClientTokenRecord(userId, tokenId) {
    const token = await prisma.clientToken.findFirst({
        where: {
            userId: Number(userId),
            tokenId: String(tokenId)
        }
    });
    return token ? serializeToken(token) : null;
}

export async function touchClientTokenRecord(userId, tokenId, meta = {}) {
    const updated = await prisma.clientToken.updateMany({
        where: {
            userId: Number(userId),
            tokenId: String(tokenId)
        },
        data: {
            lastUsedAt: new Date(),
            ...(meta.ipAddress ? { ipAddress: meta.ipAddress } : {}),
            ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
            ...(meta.platform ? { platform: meta.platform } : {})
        }
    });

    if (!updated.count) return null;
    return getClientTokenRecord(userId, tokenId);
}

export async function revokeClientTokenRecord(userId, tokenId) {
    const updated = await prisma.clientToken.updateMany({
        where: {
            userId: Number(userId),
            tokenId: String(tokenId)
        },
        data: {
            revokedAt: new Date()
        }
    });

    if (!updated.count) return null;
    return getClientTokenRecord(userId, tokenId);
}

export function isClientTokenActive(token) {
    if (!token) return false;
    if (token.revokedAt) return false;
    if (token.expiresAt && new Date(token.expiresAt).getTime() <= Date.now()) return false;
    return true;
}

function serializeToken(token) {
    return {
        tokenId: token.tokenId,
        id: token.id,
        kind: token.kind,
        label: token.label,
        ipAddress: token.ipAddress,
        userAgent: token.userAgent,
        platform: token.platform,
        issuedAt: token.issuedAt,
        lastUsedAt: token.lastUsedAt,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        userId: token.userId
    };
}
