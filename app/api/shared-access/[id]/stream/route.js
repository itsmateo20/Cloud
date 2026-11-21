import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { getSession } from "@/lib/session";
import { getUserUploadPath, resolvePathWithinBase } from "@/lib/paths";
import { getMimeType } from "@/lib/mimeTypes";
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
    if (!access.ok) return NextResponse.json({ success: false, code: "forbidden" }, { status: 403 });

    const share = access.share;
    const source = resolvePathWithinBase(getUserUploadPath(share.ownerId), share.folderPath);
    const resolution = resolvePathWithinBase(getUserUploadPath(share.ownerId), ownerPath);
    if (!source.isInside || !resolution.isInside) return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });

    const sourceRelative = path.relative(source.resolvedPath, resolution.resolvedPath).replace(/\\/g, "/");
    if (sourceRelative.startsWith("..") || path.isAbsolute(sourceRelative)) {
        return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
    }

    try {
        const stat = await fs.stat(resolution.resolvedPath);
        if (!stat.isFile()) return NextResponse.json({ success: false, code: "file_not_found" }, { status: 404 });
        const safeName = path.basename(resolution.resolvedPath);
        return new Response(Readable.toWeb(createReadStream(resolution.resolvedPath)), {
            status: 200,
            headers: {
                "Content-Type": getMimeType(safeName),
                "Content-Length": String(stat.size),
                "Content-Disposition": `inline; filename="${encodeURIComponent(safeName)}"`,
                "Accept-Ranges": "bytes",
                "Cache-Control": "private, max-age=60"
            }
        });
    } catch {
        return NextResponse.json({ success: false, code: "stream_failed" }, { status: 500 });
    }
}
