import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { getSession } from "@/lib/session";
import { getTrashEntries } from "@/lib/trash";
import { getMimeType } from "@/lib/mimeTypes";
import { getUserUploadPath } from "@/lib/paths";

export async function GET(req) {
    try {
        const session = await getSession();
        if (!session?.success || !session.user?.id) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });

        const id = new URL(req.url).searchParams.get("id");
        const entry = (await getTrashEntries(session.user.id)).find((item) => item.id === id);
        if (!entry || entry.type !== "file") return NextResponse.json({ success: false, code: "trash_file_not_found" }, { status: 404 });

        const filePath = path.join(getUserUploadPath(session.user.id), ".trash", entry.id);
        const stat = await fs.stat(filePath);
        return new Response(Readable.toWeb(createReadStream(filePath)), {
            headers: {
                "Content-Type": getMimeType(entry.name),
                "Content-Length": String(stat.size),
                "Content-Disposition": `inline; filename="${encodeURIComponent(entry.name)}"`,
                "Cache-Control": "private, max-age=60",
                "Accept-Ranges": "bytes"
            }
        });
    } catch {
        return NextResponse.json({ success: false, code: "trash_preview_failed" }, { status: 404 });
    }
}