// lib/shares.js

import crypto from "crypto";
import prisma from "@/lib/db";

function safeJsonParse(value, fallback) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function normalizeEmails(emails = []) {
    return [...new Set((emails || [])
        .map((email) => String(email || "").trim().toLowerCase())
        .filter(Boolean))];
}

function hashPasscode(passcode) {
    return crypto.createHash("sha256").update(String(passcode)).digest("hex");
}

function normalizePasscode(passcode) {
    const value = String(passcode || "").trim();
    return value.length ? value : null;
}

async function ensureColumn(tableName, columnName, alterSql) {
    const info = await prisma.$queryRawUnsafe(`PRAGMA table_info(${tableName})`);
    const exists = (info || []).some((column) => String(column.name) === columnName);
    if (!exists) {
        await prisma.$executeRawUnsafe(alterSql);
    }
}

export function parseDurationToExpiresAt(value, unit) {
    if (String(unit || "").toLowerCase() === "never") return null;
    if (!value || Number(value) <= 0) return null;

    const numericValue = Math.max(1, Number(value));
    const safeUnit = ["hours", "days", "weeks"].includes(unit) ? unit : "days";
    const now = Date.now();
    const factor = safeUnit === "hours" ? 3600_000 : safeUnit === "weeks" ? 7 * 24 * 3600_000 : 24 * 3600_000;
    return new Date(now + numericValue * factor).toISOString();
}

export async function ensureShareTables() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS SharedCollection (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ownerId INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            requireLogin INTEGER NOT NULL DEFAULT 1,
            allowedEmails TEXT NOT NULL DEFAULT '[]',
            passcodeHash TEXT,
            expiresAt TEXT,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS SharedCollectionItem (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shareId INTEGER NOT NULL,
            itemType TEXT NOT NULL,
            itemPath TEXT NOT NULL,
            itemName TEXT NOT NULL,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (shareId) REFERENCES SharedCollection(id) ON DELETE CASCADE
        )
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS SharedCollectionAccessLog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shareId INTEGER NOT NULL,
            action TEXT NOT NULL,
            outcome TEXT NOT NULL,
            itemPath TEXT,
            viewerEmail TEXT,
            viewerUserId INTEGER,
            ipAddress TEXT,
            userAgent TEXT,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (shareId) REFERENCES SharedCollection(id) ON DELETE CASCADE
        )
    `);

    await ensureColumn(
        "SharedCollection",
        "passcodeHash",
        `ALTER TABLE SharedCollection ADD COLUMN passcodeHash TEXT`
    );

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_shared_collection_owner ON SharedCollection(ownerId)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_shared_collection_token ON SharedCollection(token)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_shared_collection_item_share ON SharedCollectionItem(shareId)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_shared_collection_log_share ON SharedCollectionAccessLog(shareId)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_shared_collection_log_created ON SharedCollectionAccessLog(createdAt DESC)`);
}

export async function createShare({ ownerId, name, requireLogin, allowedEmails, passcode, expiresAt, items }) {
    const token = crypto.randomBytes(24).toString("hex");
    const normalizedEmails = normalizeEmails(allowedEmails);
    const effectiveRequireLogin = Boolean(requireLogin || normalizedEmails.length > 0);
    const normalizedPasscode = normalizePasscode(passcode);

    await prisma.$executeRawUnsafe(
        `INSERT INTO SharedCollection (ownerId, token, name, requireLogin, allowedEmails, passcodeHash, expiresAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        ownerId,
        token,
        String(name || "Untitled Share").trim(),
        effectiveRequireLogin ? 1 : 0,
        JSON.stringify(normalizedEmails),
        normalizedPasscode ? hashPasscode(normalizedPasscode) : null,
        expiresAt || null
    );

    const inserted = await prisma.$queryRawUnsafe(
        `SELECT id, ownerId, token, name, requireLogin, allowedEmails, passcodeHash, expiresAt, createdAt, updatedAt
         FROM SharedCollection
         WHERE ownerId = ? AND token = ?
         LIMIT 1`,
        ownerId,
        token
    );

    const share = inserted?.[0];
    if (!share) throw new Error("failed_to_create_share");

    for (const item of items || []) {
        await prisma.$executeRawUnsafe(
            `INSERT INTO SharedCollectionItem (shareId, itemType, itemPath, itemName, createdAt)
             VALUES (?, ?, ?, ?, datetime('now'))`,
            share.id,
            item.type === "folder" ? "folder" : "file",
            String(item.path || ""),
            String(item.name || "")
        );
    }

    return normalizeShareRow(share);
}

function normalizeShareRow(share) {
    return {
        id: Number(share.id),
        ownerId: Number(share.ownerId),
        token: String(share.token),
        name: String(share.name),
        requireLogin: Number(share.requireLogin) === 1,
        allowedEmails: safeJsonParse(share.allowedEmails, []),
        hasPasscode: Boolean(share.passcodeHash),
        expiresAt: share.expiresAt || null,
        createdAt: share.createdAt,
        updatedAt: share.updatedAt,
        isExpired: Boolean(share.expiresAt && new Date(share.expiresAt).getTime() < Date.now())
    };
}

function normalizeItemRow(item) {
    return {
        id: Number(item.id),
        shareId: Number(item.shareId),
        type: String(item.itemType),
        path: String(item.itemPath),
        name: String(item.itemName),
        createdAt: item.createdAt
    };
}

export async function listSharesByOwner(ownerId) {
    const rows = await prisma.$queryRawUnsafe(
        `SELECT s.id, s.ownerId, s.token, s.name, s.requireLogin, s.allowedEmails, s.expiresAt, s.createdAt, s.updatedAt,
                COUNT(i.id) AS itemCount
         FROM SharedCollection s
         LEFT JOIN SharedCollectionItem i ON i.shareId = s.id
         WHERE s.ownerId = ?
         GROUP BY s.id
         ORDER BY s.updatedAt DESC`,
        ownerId
    );

    return (rows || []).map((row) => ({
        ...normalizeShareRow(row),
        itemCount: Number(row.itemCount || 0)
    }));
}

export async function listSharesForViewerEmail(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) return [];

    const rows = await prisma.$queryRawUnsafe(
        `SELECT s.id, s.ownerId, s.token, s.name, s.requireLogin, s.allowedEmails, s.passcodeHash, s.expiresAt, s.createdAt, s.updatedAt,
                COUNT(i.id) AS itemCount
         FROM SharedCollection s
         LEFT JOIN SharedCollectionItem i ON i.shareId = s.id
         WHERE LOWER(s.allowedEmails) LIKE ?
         GROUP BY s.id
         ORDER BY s.updatedAt DESC`,
        `%${normalizedEmail}%`
    );

    return (rows || [])
        .map((row) => ({
            ...normalizeShareRow(row),
            itemCount: Number(row.itemCount || 0)
        }))
        .filter((share) => !share.isExpired)
        .filter((share) => normalizeEmails(share.allowedEmails || []).includes(normalizedEmail));
}

export async function removeViewerFromShare(shareId, email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) return { ok: false, code: "email_required" };

    const rows = await prisma.$queryRawUnsafe(
        `SELECT id, allowedEmails
         FROM SharedCollection
         WHERE id = ?
         LIMIT 1`,
        Number(shareId)
    );
    const share = rows?.[0];
    if (!share) return { ok: false, code: "share_not_found" };

    const currentEmails = normalizeEmails(safeJsonParse(share.allowedEmails, []));
    if (!currentEmails.includes(normalizedEmail)) {
        return { ok: false, code: "not_shared_with_user" };
    }

    const nextEmails = currentEmails.filter((entry) => entry !== normalizedEmail);

    await prisma.$executeRawUnsafe(
        `UPDATE SharedCollection
         SET allowedEmails = ?, updatedAt = datetime('now')
         WHERE id = ?`,
        JSON.stringify(nextEmails),
        Number(shareId)
    );

    return { ok: true };
}

export async function getShareByOwner(ownerId, shareId) {
    const shareRows = await prisma.$queryRawUnsafe(
        `SELECT id, ownerId, token, name, requireLogin, allowedEmails, passcodeHash, expiresAt, createdAt, updatedAt
         FROM SharedCollection
         WHERE ownerId = ? AND id = ?
         LIMIT 1`,
        ownerId,
        Number(shareId)
    );
    const share = shareRows?.[0];
    if (!share) return null;

    const itemRows = await prisma.$queryRawUnsafe(
        `SELECT id, shareId, itemType, itemPath, itemName, createdAt
         FROM SharedCollectionItem
         WHERE shareId = ?
         ORDER BY itemName ASC`,
        Number(shareId)
    );

    return {
        ...normalizeShareRow(share),
        items: (itemRows || []).map(normalizeItemRow)
    };
}

export async function updateShareByOwner(ownerId, shareId, updates) {
    const currentRows = await prisma.$queryRawUnsafe(
        `SELECT id, passcodeHash
         FROM SharedCollection
         WHERE ownerId = ? AND id = ?
         LIMIT 1`,
        ownerId,
        Number(shareId)
    );
    const current = currentRows?.[0];
    if (!current) return null;

    const normalizedEmails = normalizeEmails(updates.allowedEmails || []);
    const effectiveRequireLogin = Boolean(updates.requireLogin || normalizedEmails.length > 0);
    const normalizedPasscode = normalizePasscode(updates.passcode);
    const nextPasscodeHash = updates.clearPasscode
        ? null
        : (normalizedPasscode ? hashPasscode(normalizedPasscode) : current.passcodeHash || null);

    await prisma.$executeRawUnsafe(
        `UPDATE SharedCollection
         SET name = ?, requireLogin = ?, allowedEmails = ?, passcodeHash = ?, expiresAt = ?, updatedAt = datetime('now')
         WHERE ownerId = ? AND id = ?`,
        String(updates.name || "Untitled Share").trim(),
        effectiveRequireLogin ? 1 : 0,
        JSON.stringify(normalizedEmails),
        nextPasscodeHash,
        updates.expiresAt || null,
        ownerId,
        Number(shareId)
    );

    return await getShareByOwner(ownerId, shareId);
}

export async function deleteShareByOwner(ownerId, shareId) {
    await prisma.$executeRawUnsafe(
        `DELETE FROM SharedCollection WHERE ownerId = ? AND id = ?`,
        ownerId,
        Number(shareId)
    );
}

export async function appendItemsToShareByOwner(ownerId, shareId, items = []) {
    const share = await getShareByOwner(ownerId, shareId);
    if (!share) return null;

    const existingKeys = new Set((share.items || []).map((item) => `${item.type}:${item.path}`));

    for (const item of items) {
        const normalizedType = item.type === "folder" ? "folder" : "file";
        const normalizedPath = String(item.path || "").trim();
        const normalizedName = String(item.name || "").trim();
        if (!normalizedPath || !normalizedName) continue;

        const key = `${normalizedType}:${normalizedPath}`;
        if (existingKeys.has(key)) continue;

        await prisma.$executeRawUnsafe(
            `INSERT INTO SharedCollectionItem (shareId, itemType, itemPath, itemName, createdAt)
             VALUES (?, ?, ?, ?, datetime('now'))`,
            Number(shareId),
            normalizedType,
            normalizedPath,
            normalizedName
        );
        existingKeys.add(key);
    }

    return await getShareByOwner(ownerId, shareId);
}

export async function removeShareItemByOwner(ownerId, shareId, itemId) {
    const share = await getShareByOwner(ownerId, shareId);
    if (!share) return null;

    await prisma.$executeRawUnsafe(
        `DELETE FROM SharedCollectionItem WHERE shareId = ? AND id = ?`,
        Number(shareId),
        Number(itemId)
    );

    return await getShareByOwner(ownerId, shareId);
}

export async function getShareByToken(token) {
    const rows = await prisma.$queryRawUnsafe(
        `SELECT id, ownerId, token, name, requireLogin, allowedEmails, passcodeHash, expiresAt, createdAt, updatedAt
         FROM SharedCollection
         WHERE token = ?
         LIMIT 1`,
        token
    );

    const share = rows?.[0];
    if (!share) return null;

    const itemRows = await prisma.$queryRawUnsafe(
        `SELECT id, shareId, itemType, itemPath, itemName, createdAt
         FROM SharedCollectionItem
         WHERE shareId = ?
         ORDER BY itemName ASC`,
        Number(share.id)
    );

    return {
        ...normalizeShareRow(share),
        passcodeHash: share.passcodeHash || null,
        items: (itemRows || []).map(normalizeItemRow)
    };
}

export function canAccessShare(share, session, passcode) {
    if (!share) {
        return { ok: false, status: 404, code: "share_not_found", message: "Share not found" };
    }

    if (share.isExpired) {
        return { ok: false, status: 410, code: "share_expired", message: "This share has expired" };
    }

    const allowed = normalizeEmails(share.allowedEmails || []);
    const requiresLogin = Boolean(share.requireLogin || allowed.length > 0);

    if (!requiresLogin) {
        return { ok: true };
    }

    if (!session?.user) {
        return { ok: false, status: 401, code: "share_login_required", message: "Login required to access this share" };
    }

    if (allowed.length > 0) {
        const email = String(session.user.email || session.user.googleEmail || "").trim().toLowerCase();
        if (!email || !allowed.includes(email)) {
            return { ok: false, status: 403, code: "share_forbidden", message: "This account is not allowed to access this share" };
        }
    }

    if (share.passcodeHash) {
        const normalizedPasscode = normalizePasscode(passcode);
        if (!normalizedPasscode) {
            return { ok: false, status: 401, code: "share_passcode_required", message: "Passcode is required" };
        }
        if (hashPasscode(normalizedPasscode) !== share.passcodeHash) {
            return { ok: false, status: 403, code: "share_passcode_invalid", message: "Invalid passcode" };
        }
    }

    return { ok: true };
}

export async function logShareAccess({ shareId, action, outcome, itemPath = null, viewerEmail = null, viewerUserId = null, ipAddress = null, userAgent = null }) {
    await prisma.$executeRawUnsafe(
        `INSERT INTO SharedCollectionAccessLog (shareId, action, outcome, itemPath, viewerEmail, viewerUserId, ipAddress, userAgent, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        Number(shareId),
        String(action || "view"),
        String(outcome || "success"),
        itemPath,
        viewerEmail,
        viewerUserId,
        ipAddress,
        userAgent
    );
}

export async function listShareLogsByOwner(ownerId, shareId, limit = 200) {
    const rows = await prisma.$queryRawUnsafe(
        `SELECT l.id, l.shareId, l.action, l.outcome, l.itemPath, l.viewerEmail, l.viewerUserId, l.ipAddress, l.userAgent, l.createdAt
         FROM SharedCollectionAccessLog l
         INNER JOIN SharedCollection s ON s.id = l.shareId
         WHERE s.ownerId = ? AND s.id = ?
         ORDER BY l.createdAt DESC
         LIMIT ?`,
        Number(ownerId),
        Number(shareId),
        Number(limit)
    );

    return (rows || []).map((row) => ({
        id: Number(row.id),
        shareId: Number(row.shareId),
        action: String(row.action),
        outcome: String(row.outcome),
        itemPath: row.itemPath || null,
        viewerEmail: row.viewerEmail || null,
        viewerUserId: row.viewerUserId != null ? Number(row.viewerUserId) : null,
        ipAddress: row.ipAddress || null,
        userAgent: row.userAgent || null,
        createdAt: row.createdAt
    }));
}
