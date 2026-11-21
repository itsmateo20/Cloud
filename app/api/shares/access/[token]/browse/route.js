import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { canAccessShare, ensureShareTables, getShareByToken } from "@/lib/shares";
import { getSession } from "@/lib/session";
import { getUserUploadPath, resolvePathWithinBase } from "@/lib/paths";

function decodePasscodeFromQuery(url) {
    const encoded = url.searchParams.get("pc") || "";
    if (!encoded) return url.searchParams.get("passcode") || "";

    try {
        const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    } catch {
        return url.searchParams.get("passcode") || "";
    }
}

function isDescendantOrEqual(itemPath, targetPath) {
    return targetPath === itemPath || targetPath.startsWith(`${itemPath}/`);
}

export async function GET(req, { params }) {
    try {
        const { token } = await params;
        const url = new URL(req.url);
        const passcode = decodePasscodeFromQuery(url);
        const requestedPath = url.searchParams.get("path") || "";

        await ensureShareTables();
        const share = await getShareByToken(token);
        const session = await getSession();
        const access = await canAccessShare(share, session, passcode);
        if (!access.ok) {
            return NextResponse.json({ success: false, code: access.code, message: access.message }, { status: access.status });
        }

        const shareItems = Array.isArray(share.items) ? share.items : [];
        const userFolder = getUserUploadPath(share.ownerId);
        const currentResolution = resolvePathWithinBase(userFolder, requestedPath);
        if (!currentResolution.isInside) {
            return NextResponse.json({ success: false, code: "share_invalid_path", message: "Invalid path" }, { status: 403 });
        }

        if (requestedPath) {
            const normalizedRequested = currentResolution.relativePath;
            const allowedFolder = shareItems.some((item) =>
                item.type === "folder" && isDescendantOrEqual(item.path, normalizedRequested)
            );
            if (!allowedFolder) {
                return NextResponse.json({ success: false, code: "share_item_not_found", message: "Folder is not part of this share" }, { status: 404 });
            }

            const stat = await fs.stat(currentResolution.resolvedPath);
            if (!stat.isDirectory()) {
                return NextResponse.json({ success: false, code: "share_folder_expected", message: "Folder not found" }, { status: 400 });
            }

            const entries = await fs.readdir(currentResolution.resolvedPath, { withFileTypes: true });
            const items = await Promise.all(entries
                .filter((entry) => entry.isDirectory() || entry.isFile())
                .map(async (entry) => {
                    const fullPath = path.join(currentResolution.resolvedPath, entry.name);
                    const relativePath = normalizedRequested
                        ? `${normalizedRequested}/${entry.name}`
                        : entry.name;
                    const itemStat = await fs.stat(fullPath);
                    return {
                        id: relativePath,
                        name: entry.name,
                        path: relativePath,
                        type: entry.isDirectory() ? "folder" : "file",
                        size: entry.isDirectory() ? 0 : itemStat.size,
                        modifiedAt: itemStat.mtime.toISOString()
                    };
                }));

            items.sort((a, b) => {
                if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
                return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
            });

            return NextResponse.json({ success: true, path: normalizedRequested, items }, { status: 200 });
        }

        const rootItems = shareItems.map((item) => ({
            id: String(item.id || item.path),
            name: item.name,
            path: item.path,
            type: item.type,
            size: 0,
            modifiedAt: null
        }));

        return NextResponse.json({ success: true, path: "", items: rootItems }, { status: 200 });
    } catch {
        return NextResponse.json({ success: false, code: "share_browse_failed", message: "Failed to browse shared files" }, { status: 500 });
    }
}
