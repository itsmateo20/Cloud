import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
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

function placeholderSvg(label = "FILE") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" rx="12" fill="#1f2937"/><rect x="14" y="14" width="132" height="92" rx="8" fill="#111827"/><text x="80" y="66" fill="#d1d5db" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700">${label}</text></svg>`;
}

export async function GET(req, { params }) {
    try {
        const { token } = await params;
        const url = new URL(req.url);
        const passcode = decodePasscodeFromQuery(url);
        const itemPath = url.searchParams.get("path");
        const sizeParam = (url.searchParams.get("size") || "medium").toLowerCase();
        const sizeMap = { small: 96, medium: 160, large: 256 };
        const targetSize = sizeMap[sizeParam] || sizeMap.medium;

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

        const matchedItem = (share.items || []).find((item) => item.path === itemPath);
        if (!matchedItem) {
            return NextResponse.json({ success: false, code: "share_item_not_found", message: "File is not part of this share" }, { status: 404 });
        }

        if (matchedItem.type === "folder") {
            return new NextResponse(placeholderSvg("FOLDER"), {
                headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=120" }
            });
        }

        const userFolder = getUserUploadPath(share.ownerId);
        const fullPath = path.join(userFolder, itemPath);
        if (!fullPath.startsWith(userFolder)) {
            return NextResponse.json({ success: false, code: "share_invalid_path", message: "Invalid path" }, { status: 403 });
        }

        const fileExtension = path.extname(fullPath).toLowerCase();
        const isImage = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"].includes(fileExtension);
        const isVideo = [".mp4", ".avi", ".mov", ".wmv", ".webm", ".mkv"].includes(fileExtension);

        await fs.access(fullPath);

        if (fileExtension === ".svg") {
            const svg = await fs.readFile(fullPath, "utf-8");
            return new NextResponse(svg, {
                headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=120" }
            });
        }

        if (isImage) {
            const imageBuffer = await fs.readFile(fullPath);
            const outBuffer = await sharp(imageBuffer)
                .resize(targetSize, targetSize, { fit: "cover", position: "center" })
                .jpeg({ quality: targetSize <= 96 ? 60 : 72, mozjpeg: true })
                .toBuffer();

            return new NextResponse(outBuffer, {
                headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=120" }
            });
        }

        if (isVideo) {
            return new NextResponse(placeholderSvg("VIDEO"), {
                headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=120" }
            });
        }

        return new NextResponse(placeholderSvg("FILE"), {
            headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=120" }
        });
    } catch {
        return new NextResponse(placeholderSvg("FILE"), {
            status: 200,
            headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=30" }
        });
    }
}
