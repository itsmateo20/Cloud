import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createReadStream } from "fs";
import { getSession } from "@/lib/session";
import { canAccessShare, ensureShareTables, getShareByToken } from "@/lib/shares";
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

function getMime(ext) {
    const mimeTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".bmp": "image/bmp",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".ogg": "video/ogg",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
        ".avi": "video/x-msvideo",
        ".wmv": "video/x-ms-wmv",
        ".pdf": "application/pdf",
        ".txt": "text/plain; charset=utf-8",
        ".md": "text/markdown; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".xml": "application/xml; charset=utf-8",
        ".csv": "text/csv; charset=utf-8"
    };
    return mimeTypes[ext] || "application/octet-stream";
}

export async function GET(req, { params }) {
    try {
        const { token } = await params;
        const url = new URL(req.url);
        const passcode = decodePasscodeFromQuery(url);
        const itemPath = url.searchParams.get("path");

        if (!itemPath) {
            return NextResponse.json({ success: false, code: "share_path_required", message: "path is required" }, { status: 400 });
        }

        await ensureShareTables();
        const share = await getShareByToken(token);
        const session = await getSession();
        const access = canAccessShare(share, session, passcode);
        if (!access.ok) {
            return NextResponse.json({ success: false, code: access.code, message: access.message }, { status: access.status });
        }

        const matchedItem = (share.items || []).find((item) => item.path === itemPath && item.type === "file");
        if (!matchedItem) {
            return NextResponse.json({ success: false, code: "share_item_not_found", message: "File is not part of this share" }, { status: 404 });
        }

        const userFolder = getUserUploadPath(share.ownerId);
        const targetPath = path.join(userFolder, itemPath);
        if (!targetPath.startsWith(userFolder)) {
            return NextResponse.json({ success: false, code: "share_invalid_path", message: "Invalid path" }, { status: 403 });
        }

        const stat = await fs.stat(targetPath);
        if (!stat.isFile()) {
            return NextResponse.json({ success: false, code: "share_file_expected", message: "Expected file" }, { status: 400 });
        }

        const stream = createReadStream(targetPath);
        const readableStream = new ReadableStream({
            start(controller) {
                stream.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk)));
                stream.on("end", () => controller.close());
                stream.on("error", (error) => controller.error(error));
            },
            cancel() {
                stream.destroy();
            }
        });

        return new Response(readableStream, {
            status: 200,
            headers: {
                "Content-Type": getMime(path.extname(targetPath).toLowerCase()),
                "Content-Length": String(stat.size),
                "Content-Disposition": `inline; filename="${encodeURIComponent(path.basename(targetPath))}"`,
                "Cache-Control": "private, max-age=60"
            }
        });
    } catch {
        return NextResponse.json({ success: false, code: "share_stream_failed", message: "Failed to stream shared file" }, { status: 500 });
    }
}
