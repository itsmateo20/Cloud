import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import sanitizeFilename from "sanitize-filename";
import { Readable } from "stream";
import { ZipArchive } from "archiver";
import { getSession } from "@/lib/session";
import { getUserUploadPath, resolvePathWithinBase } from "@/lib/paths";
import { canAccessSharedFolder } from "@/lib/sharedAccess";

export async function GET(req, { params }) {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(req.url);
    const ownerPath = String(url.searchParams.get("path") || "");
    const email = session.user.email || session.user.googleEmail || session.user.githubEmail || session.user.discordEmail || "";
    const access = await canAccessSharedFolder(Number(id), session.user.id, email);
    if (!access.ok) {
        return NextResponse.json({ success: false, code: "forbidden" }, { status: 403 });
    }

    const share = access.share;
    const source = resolvePathWithinBase(getUserUploadPath(share.ownerId), share.folderPath);
    const resolution = resolvePathWithinBase(getUserUploadPath(share.ownerId), ownerPath);
    if (!source.isInside || !resolution.isInside) {
        return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
    }
    const sourceRelative = path.relative(source.resolvedPath, resolution.resolvedPath).replace(/\\/g, "/");
    if (sourceRelative === "" || sourceRelative.startsWith("..")) {
        if (path.resolve(source.resolvedPath) !== path.resolve(resolution.resolvedPath)) {
            return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
        }
    }

    try {
        const stat = await fs.stat(resolution.resolvedPath);
        if (stat.isDirectory()) {
            const archive = new ZipArchive({ zlib: { level: 9 } });
            let failed = false;
            const stream = new ReadableStream({
                start(controller) {
                    archive.on("data", (chunk) => {
                        if (!failed) controller.enqueue(new Uint8Array(chunk));
                    });
                    archive.on("end", () => {
                        if (!failed) controller.close();
                    });
                    archive.on("error", (error) => {
                        failed = true;
                        controller.error(error);
                    });
                    addFolderToArchive(archive, resolution.resolvedPath, "").then(() => archive.finalize()).catch((error) => {
                        failed = true;
                        controller.error(error);
                    });
                },
                cancel() {
                    failed = true;
                    archive.destroy();
                }
            });
            const safeName = sanitizeFilename(path.basename(resolution.resolvedPath)) || "folder";
            return new Response(stream, {
                status: 200,
                headers: {
                    "Content-Type": "application/zip",
                    "Content-Disposition": `attachment; filename="${encodeURIComponent(`${safeName}.zip`)}"`,
                    "Cache-Control": "private, max-age=60"
                }
            });
        }
        if (!stat.isFile()) return NextResponse.json({ success: false, code: "invalid_file_type" }, { status: 400 });
        const safeName = sanitizeFilename(path.basename(resolution.resolvedPath)) || "download";
        return new Response(Readable.toWeb(createReadStream(resolution.resolvedPath)), {
            status: 200,
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Length": String(stat.size),
                "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}"`,
                "Cache-Control": "private, max-age=60"
            }
        });
    } catch (error) {
        return NextResponse.json({ success: false, code: "download_failed", message: error.message }, { status: 500 });
    }
}

async function addFolderToArchive(archive, folderPath, relativePath) {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    for (const entry of entries) {
        const absolutePath = path.join(folderPath, entry.name);
        const archivePath = path.posix.join(relativePath, entry.name);
        if (entry.isDirectory()) {
            await addFolderToArchive(archive, absolutePath, archivePath);
        } else if (entry.isFile()) {
            archive.file(absolutePath, { name: archivePath });
        }
    }
}
