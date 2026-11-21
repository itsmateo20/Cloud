import prisma from "@/lib/db";

function normalizeEmails(emails = []) {
    return [...new Set((emails || [])
        .map((email) => String(email || "").trim().toLowerCase())
        .filter(Boolean))];
}

export async function ensureSharedAccessTables() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS SharedAccessFolder (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ownerId INTEGER NOT NULL,
            folderPath TEXT NOT NULL,
            name TEXT NOT NULL,
            allowedEmails TEXT NOT NULL DEFAULT '[]',
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS SharedAccessMember (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shareId INTEGER NOT NULL,
            userId INTEGER NOT NULL,
            email TEXT NOT NULL,
            joinedAt TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (shareId, userId)
        )
    `);

}

export async function getSharedAccessFoldersForUser(userId, email) {
    await ensureSharedAccessTables();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    const shares = await prisma.$queryRawUnsafe(`
        SELECT s.id, s.ownerId, s.folderPath, s.name, s.allowedEmails, s.createdAt,
               u.email AS ownerEmail,
               CASE WHEN s.ownerId = ? THEN 1 ELSE 0 END AS isOwner,
               EXISTS (
                   SELECT 1 FROM SharedAccessMember m
                   WHERE m.shareId = s.id AND m.userId = ?
               ) AS isMember
        FROM SharedAccessFolder s
        JOIN User u ON u.id = s.ownerId
        WHERE s.ownerId = ? OR EXISTS (
            SELECT 1 FROM SharedAccessMember m
            WHERE m.shareId = s.id AND m.userId = ?
        )
        ORDER BY s.updatedAt DESC
    `, userId, userId, userId, userId);

    return shares.filter((share) => {
        if (Number(share.isOwner) === 1 || Boolean(share.isMember)) return true;
        try {
            return normalizeEmails(JSON.parse(share.allowedEmails || "[]")).includes(normalizedEmail);
        } catch {
            return false;
        }
    });
}

export async function getSharedAccessFolderById(shareId) {
    await ensureSharedAccessTables();
    const rows = await prisma.$queryRawUnsafe(`
        SELECT s.*, u.email AS ownerEmail
        FROM SharedAccessFolder s
        JOIN User u ON u.id = s.ownerId
        WHERE s.id = ?
        LIMIT 1
    `, shareId);
    return rows?.[0] || null;
}

export async function canAccessSharedFolder(shareId, userId, email) {
    const share = await getSharedAccessFolderById(shareId);
    if (!share) return { ok: false, share: null, reason: "not_found" };
    if (Number(share.ownerId) === Number(userId)) return { ok: true, share, reason: "owner" };

    const members = await prisma.$queryRawUnsafe(`
        SELECT id FROM SharedAccessMember
        WHERE shareId = ? AND userId = ?
        LIMIT 1
    `, shareId, userId);
    if (members?.length) return { ok: true, share, reason: "member" };

    let allowed = [];
    try {
        allowed = JSON.parse(share.allowedEmails || "[]");
    } catch {
        allowed = [];
    }
    if (normalizeEmails(allowed).includes(String(email || "").trim().toLowerCase())) {
        return { ok: true, share, reason: "email" };
    }

    return { ok: false, share, reason: "forbidden" };
}

export async function createSharedAccessFolder({ ownerId, folderPath, name, allowedEmails }) {
    await ensureSharedAccessTables();
    const normalizedEmails = normalizeEmails(allowedEmails);

    const invitedUsers = [];
    for (const invitedEmail of normalizedEmails) {
        const users = await prisma.$queryRawUnsafe(`
            SELECT id
            FROM User
            WHERE lower(email) = ? OR lower(googleEmail) = ? OR lower(githubEmail) = ? OR lower(discordEmail) = ?
            LIMIT 1
        `, invitedEmail, invitedEmail, invitedEmail, invitedEmail);
        const invitedUser = users?.[0];
        if (!invitedUser?.id) {
            const error = new Error(`No project account found for ${invitedEmail}`);
            error.code = "shared_access_user_not_found";
            throw error;
        }
        invitedUsers.push({ id: invitedUser.id, email: invitedEmail });
    }

    await prisma.$executeRawUnsafe(`
        INSERT INTO SharedAccessFolder (ownerId, folderPath, name, allowedEmails, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `, ownerId, folderPath, name, JSON.stringify(normalizedEmails));

    const rows = await prisma.$queryRawUnsafe(`
        SELECT id         FROM SharedAccessFolder
        WHERE ownerId = ? AND folderPath = ? AND name = ?
        ORDER BY id DESC LIMIT 1
    `, ownerId, folderPath, name);
    const share = rows?.[0];
    if (!share) throw new Error("failed_to_create_shared_access");

    for (const invitedUser of invitedUsers) {
        await prisma.$executeRawUnsafe(`
            INSERT OR IGNORE INTO SharedAccessMember (shareId, userId, email)
            VALUES (?, ?, ?)
        `, share.id, invitedUser.id, invitedUser.email);
    }

    return share;
}

export async function addSharedAccessMember(shareId, userId, email) {
    await prisma.$executeRawUnsafe(`
        INSERT OR IGNORE INTO SharedAccessMember (shareId, userId, email)
        VALUES (?, ?, ?)
    `, shareId, userId, String(email || "").trim().toLowerCase());
}
