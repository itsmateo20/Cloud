import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import prisma from "@/lib/db";
import { getUserUploadPath, resolvePathWithinBase } from "@/lib/paths";

const TRASH_DIR = ".trash";
const INDEX_FILE = ".index.json";

function getTrashPath(userId) {
    return path.join(getUserUploadPath(userId), TRASH_DIR);
}

async function readIndex(userId) {
    try {
        return JSON.parse(await fs.readFile(path.join(getTrashPath(userId), INDEX_FILE), "utf8"));
    } catch {
        return [];
    }
}

async function writeIndex(userId, entries) {
    const trashPath = getTrashPath(userId);
    await fs.mkdir(trashPath, { recursive: true });
    await fs.writeFile(path.join(trashPath, INDEX_FILE), JSON.stringify(entries, null, 2), "utf8");
}

export async function getTrashEntries(userId) {
    const entries = await readIndex(userId);
    return entries.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
}

export async function moveToTrash(userId, relativePath) {
    const userRoot = getUserUploadPath(userId);
    const resolved = resolvePathWithinBase(userRoot, relativePath);
    if (!resolved.isInside || resolved.relativePath.startsWith(`${TRASH_DIR}/`) || resolved.relativePath === TRASH_DIR) {
        throw new Error("Invalid trash path");
    }

    const stat = await fs.stat(resolved.resolvedPath);
    const id = crypto.randomUUID();
    const trashItemPath = path.join(getTrashPath(userId), id);
    await fs.mkdir(getTrashPath(userId), { recursive: true });
    await fs.rename(resolved.resolvedPath, trashItemPath);

    const entries = await readIndex(userId);
    entries.push({
        id,
        name: path.basename(resolved.relativePath),
        originalPath: resolved.relativePath,
        type: stat.isDirectory() ? "folder" : "file",
        size: stat.isFile() ? stat.size : null,
        deletedAt: new Date().toISOString()
    });
    await writeIndex(userId, entries);
    return entries.at(-1);
}

export async function restoreFromTrash(userId, id) {
    const entries = await readIndex(userId);
    const entry = entries.find((item) => item.id === id);
    if (!entry) throw new Error("Trash item not found");

    const userRoot = getUserUploadPath(userId);
    const destination = resolvePathWithinBase(userRoot, entry.originalPath);
    if (!destination.isInside || destination.relativePath.startsWith(`${TRASH_DIR}/`)) throw new Error("Invalid restore path");
    await fs.mkdir(path.dirname(destination.resolvedPath), { recursive: true });
    await fs.rename(path.join(getTrashPath(userId), entry.id), destination.resolvedPath);
    await writeIndex(userId, entries.filter((item) => item.id !== id));
    return entry;
}

export async function permanentlyDeleteTrashItem(userId, id) {
    const entries = await readIndex(userId);
    const entry = entries.find((item) => item.id === id);
    if (!entry) throw new Error("Trash item not found");
    await fs.rm(path.join(getTrashPath(userId), entry.id), { recursive: true, force: true });
    await writeIndex(userId, entries.filter((item) => item.id !== id));
    return entry;
}

export async function purgeExpiredTrash(userId) {
    const settings = await prisma.userSettings.findUnique({ where: { userId }, select: { trashRetentionDays: true } });
    const retentionDays = Math.max(1, Number(settings?.trashRetentionDays || 30));
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const entries = await readIndex(userId);
    const expired = entries.filter((item) => new Date(item.deletedAt).getTime() <= cutoff);
    for (const entry of expired) await fs.rm(path.join(getTrashPath(userId), entry.id), { recursive: true, force: true });
    if (expired.length) await writeIndex(userId, entries.filter((item) => new Date(item.deletedAt).getTime() > cutoff));
}

export function isTrashPath(relativePath) {
    const normalized = String(relativePath || "").replace(/\\/g, "/");
    return normalized === TRASH_DIR || normalized.startsWith(`${TRASH_DIR}/`);
}