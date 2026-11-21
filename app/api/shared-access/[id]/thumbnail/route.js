import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getSession } from "@/lib/session";
import { getUserUploadPath, resolvePathWithinBase } from "@/lib/paths";
import { canAccessSharedFolder } from "@/lib/sharedAccess";

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"]);

export async function GET(req, { params }) {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(req.url);
    const ownerPath = String(url.searchParams.get("path") || "");
    const sizeParam = (url.searchParams.get("size") || "medium").toLowerCase();
    const sizeMap = { small: 96, medium: 160, large: 256 };
    const targetSize = sizeMap[sizeParam] || sizeMap.medium;
    if (!ownerPath) {
        return NextResponse.json({ success: false, code: "path_required" }, { status: 400 });
    }

    const email = session.user.email || session.user.googleEmail || session.user.githubEmail || session.user.discordEmail || "";
    const access = await canAccessSharedFolder(Number(id), session.user.id, email);
    if (!access.ok) {
        return NextResponse.json({ success: false, code: "forbidden" }, { status: 403 });
    }

    const userFolder = getUserUploadPath(access.share.ownerId);
    const source = resolvePathWithinBase(userFolder, access.share.folderPath);
    const target = resolvePathWithinBase(userFolder, ownerPath);
    if (
        !source.isInside ||
        !target.isInside ||
        access.share.folderPath === ".private" ||
        access.share.folderPath.startsWith(".private/")
    ) {
        return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
    }

    const sourceRelative = path.relative(source.resolvedPath, target.resolvedPath);
    if (sourceRelative.startsWith("..") || path.isAbsolute(sourceRelative)) {
        return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
    }

    let stat;
    try {
        stat = await fs.stat(target.resolvedPath);
    } catch {
        return NextResponse.json({ success: false, code: "file_not_found" }, { status: 404 });
    }
    if (!stat.isFile()) {
        return NextResponse.json({ success: false, code: "file_not_found" }, { status: 404 });
    }
    if (!imageExtensions.has(path.extname(target.resolvedPath).toLowerCase())) {
        return NextResponse.json({ success: false, code: "unsupported_thumbnail" }, { status: 400 });
    }

    const etag = `"${stat.mtimeMs}-${stat.size}-${targetSize}"`;
    if (req.headers.get("if-none-match") === etag) {
        return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    try {
        const thumbnail = await sharp(target.resolvedPath)
            .resize(targetSize, targetSize, { fit: "cover", position: "center" })
            .jpeg({ quality: targetSize <= 96 ? 60 : 72, mozjpeg: true })
            .toBuffer();

        return new NextResponse(thumbnail, {
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "private, max-age=120",
                ETag: etag
            }
        });
    } catch {
        return NextResponse.json({ success: false, code: "thumbnail_failed" }, { status: 500 });
    }
}
