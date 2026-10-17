import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { getSession } from "@/lib/session";
import { getUserUploadPath } from "@/lib/paths";
import { isPrivateAccess } from "@/lib/privateAccess";
import { getMimeType } from "@/lib/mimeTypes";

export async function GET(req) {
    const session = await getSession();
    if (!session?.success || !session.user?.id) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    if (!await isPrivateAccess(session.user.id)) return NextResponse.json({ success: false, code: "private_locked" }, { status: 403 });

    const filePath = new URL(req.url).searchParams.get("path") || "";
    const root = path.join(getUserUploadPath(session.user.id), ".private");
    const target = path.resolve(root, filePath);
    const relative = path.relative(root, target);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });

    try {
        const stat = await fs.stat(target);
        if (!stat.isFile()) return NextResponse.json({ success: false, code: "file_not_found" }, { status: 404 });
        const download = new URL(req.url).searchParams.get("download") === "1";
        return new Response(Readable.toWeb(createReadStream(target)), {
            headers: {
                "Content-Type": getMimeType(path.basename(target)),
                "Content-Length": String(stat.size),
                "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(path.basename(target))}"`,
                "Cache-Control": "private, max-age=60",
                "Accept-Ranges": "bytes"
            }
        });
    } catch {
        return NextResponse.json({ success: false, code: "file_not_found" }, { status: 404 });
    }
}
