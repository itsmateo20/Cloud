// app/api/shares/access/[token]/download-all/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import archiver from "archiver";
import { getSession } from "@/lib/session";
import { canAccessShare, ensureShareTables, getShareByToken, logShareAccess } from "@/lib/shares";
import { getUserUploadPath } from "@/lib/paths";

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

async function getAllFilesInDirectory(dirPath, basePath = "") {
    const files = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
            const nested = await getAllFilesInDirectory(fullPath, relativePath);
            files.push(...nested);
        } else if (entry.isFile()) {
            const stat = await fs.stat(fullPath);
            files.push({
                fullPath,
                relativePath: relativePath.replace(/\\/g, "/"),
                mtime: stat.mtime
            });
        }
    }

    return files;
}

function buildZipStream(files) {
    const archive = archiver("zip", { zlib: { level: 6 } });
    let archiveFinalized = false;
    let hasError = false;

    const readableStream = new ReadableStream({
        start(controller) {
            archive.on("data", (chunk) => {
                if (!hasError) controller.enqueue(new Uint8Array(chunk));
            });
            archive.on("end", () => {
                if (!hasError) controller.close();
            });
            archive.on("error", (error) => {
                hasError = true;
                controller.error(error);
            });

            const append = async () => {
                for (const file of files) {
                    if (hasError) break;
                    const stream = createReadStream(file.fullPath);
                    archive.append(stream, { name: file.relativePath, date: file.mtime });
                }
                if (!hasError && !archiveFinalized) {
                    archiveFinalized = true;
                    await archive.finalize();
                }
            };

            append();
        },
        cancel() {
            hasError = true;
            if (!archiveFinalized) archive.destroy();
        }
    });

    return readableStream;
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
                action: "download_all",
                outcome: access.ok ? "authorized" : access.code,
                viewerEmail,
                viewerUserId,
                ipAddress,
                userAgent
            });
        }

        if (!access.ok) {
            return NextResponse.json({ success: false, code: access.code, message: access.message }, { status: access.status });
        }

        const userFolder = getUserUploadPath(share.ownerId);
        const zipFiles = [];
        const seen = new Set();

        for (const item of (share.items || [])) {
            const targetPath = path.join(userFolder, item.path);
            if (!targetPath.startsWith(userFolder)) continue;

            try {
                const stat = await fs.stat(targetPath);
                if (item.type === "folder" && stat.isDirectory()) {
                    const nested = await getAllFilesInDirectory(targetPath, path.basename(targetPath));
                    for (const file of nested) {
                        if (seen.has(file.relativePath)) continue;
                        seen.add(file.relativePath);
                        zipFiles.push(file);
                    }
                } else if (item.type === "file" && stat.isFile()) {
                    const relativePath = path.basename(item.path);
                    if (!seen.has(relativePath)) {
                        seen.add(relativePath);
                        zipFiles.push({ fullPath: targetPath, relativePath, mtime: stat.mtime });
                    }
                }
            } catch {
            }
        }

        if (!zipFiles.length) {
            return NextResponse.json({ success: false, code: "share_empty", message: "No downloadable items in this share" }, { status: 400 });
        }

        await logShareAccess({
            shareId: share.id,
            action: "download_all_zip",
            outcome: "success",
            viewerEmail,
            viewerUserId,
            ipAddress,
            userAgent
        });

        const zipName = `${String(share.name || "share").replace(/[^a-zA-Z0-9_-]/g, "_")}.zip`;
        const stream = buildZipStream(zipFiles);

        return new Response(stream, {
            status: 200,
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${encodeURIComponent(zipName)}"`,
                "Cache-Control": "no-cache"
            }
        });
    } catch {
        return NextResponse.json({ success: false, code: "share_download_all_failed", message: "Failed to download full share" }, { status: 500 });
    }
}
