// app/api/shares/access/[token]/download/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createReadStream } from "fs";
import { Readable } from "stream";
import { ZipArchive } from "archiver";
import { getSession } from "@/lib/session";
import { canAccessShare, ensureShareTables, getShareByToken, logShareAccess } from "@/lib/shares";
import { getUserUploadPath, resolvePathWithinBase } from "@/lib/paths";
import { getMimeType } from "@/lib/mimeTypes";
import sanitizeFilename from "sanitize-filename";

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
                size: stat.size,
                mtime: stat.mtime
            });
        }
    }

    return files;
}

function buildZipStream(files) {
    const archive = new ZipArchive({ zlib: { level: 9 } });
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
                    archive.append(stream, {
                        name: file.relativePath,
                        date: file.mtime
                    });
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
        const itemPath = url.searchParams.get("path");
        const passcode = decodePasscodeFromQuery(url);
        if (!itemPath) {
            return NextResponse.json({ success: false, code: "share_path_required", message: "path is required" }, { status: 400 });
        }

        await ensureShareTables();
        const share = await getShareByToken(token);
        const session = await getSession();
        const access = await canAccessShare(share, session, passcode);

        const viewerEmail = session?.user ? String(session.user.email || session.user.googleEmail || "") : null;
        const viewerUserId = session?.user?.id ?? null;
        const ipAddress = req.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() || null;
        const userAgent = req.headers.get("user-agent") || null;

        if (share?.id) {
            await logShareAccess({
                shareId: share.id,
                action: "download",
                outcome: access.ok ? "authorized" : access.code,
                itemPath,
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
        const itemResolution = resolvePathWithinBase(userFolder, itemPath);
        const matchedItem = (share.items || []).find((item) => item.path === itemResolution.relativePath && ["file", "folder"].includes(item.type));
        if (!matchedItem) {
            return NextResponse.json({ success: false, code: "share_item_not_found", message: "File is not part of this share" }, { status: 404 });
        }

        if (!itemResolution.isInside) {
            return NextResponse.json({ success: false, code: "share_invalid_path", message: "Invalid path" }, { status: 403 });
        }
        const targetPath = itemResolution.resolvedPath;

        const stat = await fs.stat(targetPath);

        if (matchedItem.type === "folder") {
            if (!stat.isDirectory()) {
                return NextResponse.json({ success: false, code: "share_folder_expected", message: "Folder not found" }, { status: 400 });
            }

            const filesInFolder = await getAllFilesInDirectory(targetPath, path.basename(targetPath));
            if (!filesInFolder.length) {
                return NextResponse.json({ success: false, code: "share_empty_folder", message: "Folder is empty" }, { status: 400 });
            }

            await logShareAccess({
                shareId: share.id,
                action: "download_folder_zip",
                outcome: "success",
                itemPath,
                viewerEmail,
                viewerUserId,
                ipAddress,
                userAgent
            });

            const zipName = `${sanitizeFilename(path.basename(targetPath) || "folder") || "folder"}.zip`;
            const zipStream = buildZipStream(filesInFolder);

            return new Response(zipStream, {
                status: 200,
                headers: {
                    "Content-Type": "application/zip",
                    "Content-Disposition": `attachment; filename="${encodeURIComponent(zipName)}"`,
                    "Cache-Control": "no-cache"
                }
            });
        }

        if (stat.isDirectory()) {
            return NextResponse.json({ success: false, code: "share_file_expected", message: "Only files can be downloaded directly" }, { status: 400 });
        }

        await logShareAccess({
            shareId: share.id,
            action: "download_file",
            outcome: "success",
            itemPath,
            viewerEmail,
            viewerUserId,
            ipAddress,
            userAgent
        });

        return new Response(Readable.toWeb(createReadStream(targetPath)), {
            status: 200,
            headers: {
                "Content-Type": getMimeType(path.basename(targetPath)),
                "Content-Length": String(stat.size),
                "Content-Disposition": `attachment; filename="${encodeURIComponent(sanitizeFilename(path.basename(targetPath)) || path.basename(targetPath) || "download")}"`,
                "Cache-Control": "no-cache"
            }
        });
    } catch {
        return NextResponse.json({ success: false, code: "share_download_failed", message: "Failed to download shared file" }, { status: 500 });
    }
}
