import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import prisma from "@/lib/db";
import { getUserUploadPath, resolvePathWithinBase } from "@/lib/paths";

const TRASH_DIR = ".trash";
const INDEX_FILE = ".index.json";

function getTrashPath(userId, storage = "main") {
    const root = storage === "private" ? path.join(getUserUploadPath(userId), ".private") : getUserUploadPath(userId);
    return path.join(root, TRASH_DIR);
}

async function readIndex(userId, storage = "main") {
    try {
        return JSON.parse(await fs.readFile(path.join(getTrashPath(userId, storage), INDEX_FILE), "utf8"));
    } catch {
        return [];
    }
}

async function writeIndex(userId, entries, storage = "main") {
    const trashPath = getTrashPath(userId, storage);
    await fs.mkdir(trashPath, { recursive: true });
    await fs.writeFile(path.join(trashPath, INDEX_FILE), JSON.stringify(entries, null, 2), "utf8");
}

export async function getTrashEntries(userId) {
    const [mainEntries, privateEntries] = await Promise.all([
        readIndex(userId, "main"),
        readIndex(userId, "private")
    ]);
    const entries = [
        ...mainEntries.map((entry) => ({ ...entry, storage: entry.storage || "main" })),
        ...privateEntries.map((entry) => ({ ...entry, storage: "private" }))
    ];
    return entries.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
}

export async function moveToTrash(userId, relativePath, storage = "main") {
    const userRoot = storage === "private" ? path.join(getUserUploadPath(userId), ".private") : getUserUploadPath(userId);
    const resolved = resolvePathWithinBase(userRoot, relativePath);
    if (!resolved.isInside || resolved.relativePath.startsWith(`${TRASH_DIR}/`) || resolved.relativePath === TRASH_DIR) {
        throw new Error("Invalid trash path");
    }

    const stat = await fs.stat(resolved.resolvedPath);
    const id = crypto.randomUUID();
    const trashItemPath = path.join(getTrashPath(userId, storage), id);
    await fs.mkdir(getTrashPath(userId, storage), { recursive: true });
    await fs.rename(resolved.resolvedPath, trashItemPath);

    const entries = await readIndex(userId, storage);
    entries.push({
        id,
        name: path.basename(resolved.relativePath),
        originalPath: resolved.relativePath,
        type: stat.isDirectory() ? "folder" : "file",
        size: stat.isFile() ? stat.size : null,
        deletedAt: new Date().toISOString(),
        storage
    });
    await writeIndex(userId, entries, storage);
    return entries.at(-1);
}

export async function restoreFromTrash(userId, id) {
    const entries = await getTrashEntries(userId);
    const entry = entries.find((item) => item.id === id);
    if (!entry) throw new Error("Trash item not found");

    const storage = entry.storage || "main";
    const userRoot = storage === "private" ? path.join(getUserUploadPath(userId), ".private") : getUserUploadPath(userId);
    const destination = resolvePathWithinBase(userRoot, entry.originalPath);
    if (!destination.isInside || destination.relativePath.startsWith(`${TRASH_DIR}/`)) throw new Error("Invalid restore path");
    await fs.mkdir(path.dirname(destination.resolvedPath), { recursive: true });
    await fs.rename(path.join(getTrashPath(userId, storage), entry.id), destination.resolvedPath);
    const storageEntries = entries.filter((item) => item.storage === storage && item.id !== id);
    await writeIndex(userId, storageEntries, storage);
    return entry;
}

export async function permanentlyDeleteTrashItem(userId, id) {
    const entries = await getTrashEntries(userId);
    const entry = entries.find((item) => item.id === id);
    if (!entry) throw new Error("Trash item not found");
    const storage = entry.storage || "main";
    await fs.rm(path.join(getTrashPath(userId, storage), entry.id), { recursive: true, force: true });
    await writeIndex(userId, entries.filter((item) => item.storage === storage && item.id !== id), storage);
    return entry;
}

export async function purgeExpiredTrash(userId) {
    const settings = await prisma.userSettings.findUnique({ where: { userId }, select: { trashRetentionDays: true } });
    const retentionDays = Math.max(1, Number(settings?.trashRetentionDays || 30));
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const entries = await getTrashEntries(userId);
    const expired = entries.filter((item) => new Date(item.deletedAt).getTime() <= cutoff);
    for (const entry of expired) {
        await fs.rm(path.join(getTrashPath(userId, entry.storage || "main"), entry.id), { recursive: true, force: true });
    }

    for (const storage of ["main", "private"]) {
        const remaining = entries.filter((item) => (item.storage || "main") === storage && !expired.some((expiredItem) => expiredItem.id === item.id));
        if (expired.some((item) => (item.storage || "main") === storage)) {
            await writeIndex(userId, remaining, storage);
        }
    }
}

export function isTrashPath(relativePath) {
    const normalized = String(relativePath || "").replace(/\\/g, "/");
    return normalized === TRASH_DIR || normalized.startsWith(`${TRASH_DIR}/`);
}