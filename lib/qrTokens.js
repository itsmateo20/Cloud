// lib/qrTokens.js

import prisma from "@/lib/db";

function normalizeQrTokenRow(row) {
    if (!row) return null;
    return {
        id: Number(row.id),
        token: String(row.token),
        type: String(row.type),
        data: String(row.data || "{}"),
        expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
        createdAt: row.createdAt ? new Date(row.createdAt) : null,
    };
}

export async function ensureQrTokenTable() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS QrToken (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL,
            data TEXT NOT NULL,
            expiresAt TEXT NOT NULL,
            createdAt TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_qr_token_token ON QrToken(token)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_qr_token_expires ON QrToken(expiresAt)`);
}

export async function createQrToken({ token, type, data, expiresAt }) {
    await ensureQrTokenTable();
    await prisma.$executeRawUnsafe(
        `INSERT INTO QrToken (token, type, data, expiresAt, createdAt)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        token,
        type,
        data,
        new Date(expiresAt).toISOString()
    );

    const rows = await prisma.$queryRawUnsafe(
        `SELECT id, token, type, data, expiresAt, createdAt FROM QrToken WHERE token = ? LIMIT 1`,
        token
    );

    return normalizeQrTokenRow(rows?.[0]);
}

export async function findQrTokenByToken(token) {
    await ensureQrTokenTable();
    const rows = await prisma.$queryRawUnsafe(
        `SELECT id, token, type, data, expiresAt, createdAt FROM QrToken WHERE token = ? LIMIT 1`,
        token
    );

    return normalizeQrTokenRow(rows?.[0]);
}

export async function deleteQrTokenById(id) {
    await ensureQrTokenTable();
    await prisma.$executeRawUnsafe(`DELETE FROM QrToken WHERE id = ?`, Number(id));
}

export async function deleteExpiredQrTokens() {
    await ensureQrTokenTable();
    const result = await prisma.$executeRawUnsafe(
        `DELETE FROM QrToken WHERE datetime(expiresAt) < datetime('now')`
    );

    return Number(result || 0);
}
