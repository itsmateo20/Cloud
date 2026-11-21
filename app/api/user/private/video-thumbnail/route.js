import { NextResponse } from "next/server";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { Readable } from "stream";
import { spawn } from "child_process";
import { getSession } from "@/lib/session";
import { getUserUploadPath } from "@/lib/paths";
import { isPrivateAccess } from "@/lib/privateAccess";

export async function GET(req) {
    const session = await getSession();
    if (!session?.success || !session.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }
    if (!await isPrivateAccess(session.user.id)) {
        return NextResponse.json({ success: false, code: "private_locked" }, { status: 403 });
    }

    const url = new URL(req.url);
    const filePath = url.searchParams.get("path") || "";
    if (!filePath) {
        return NextResponse.json({ success: false, code: "file_path_required" }, { status: 400 });
    }

    const sizeParam = (url.searchParams.get("size") || "medium").toLowerCase();
    const sizeMap = { small: 96, medium: 128, large: 256 };
    const targetSize = sizeMap[sizeParam] || sizeMap.medium;
    const privateRoot = path.join(getUserUploadPath(session.user.id), ".private");
    const target = path.resolve(privateRoot, filePath);
    const relative = path.relative(privateRoot, target);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
        return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
    }

    const allowed = [".mp4", ".webm", ".mov", ".mkv", ".avi", ".wmv"];
    if (!allowed.includes(path.extname(target).toLowerCase())) {
        return NextResponse.json({ success: false, code: "unsupported_video_type" }, { status: 400 });
    }

    try {
        const stat = await fs.stat(target);
        if (!stat.isFile()) {
            return NextResponse.json({ success: false, code: "file_not_found" }, { status: 404 });
        }

        const sourceMTimeMs = stat.mtimeMs;
        const etag = `"${sourceMTimeMs}-private-vthumb-${targetSize}"`;
        if (req.headers.get("if-none-match") === etag) {
            return new NextResponse(null, { status: 304, headers: { "ETag": etag } });
        }

        const thumbsDir = path.join(getUserUploadPath(session.user.id), ".thumbnails", "private");
        const outFile = path.join(thumbsDir, `${relative}.video.${targetSize}.jpg`);
        await fs.mkdir(path.dirname(outFile), { recursive: true });

        let useCached = false;
        if (fsSync.existsSync(outFile)) {
            try {
                const cacheStat = await fs.stat(outFile);
                useCached = cacheStat.mtimeMs >= sourceMTimeMs;
            } catch { }
        }

        if (!useCached) {
            await new Promise((resolve, reject) => {
                const tmpFile = `${outFile}.tmp.jpg`;
                const args = [
                    "-ss", "0.5",
                    "-i", target,
                    "-frames:v", "1",
                    "-vf", `scale=${targetSize}:-1:force_original_aspect_ratio=decrease`,
                    "-q:v", "4",
                    tmpFile
                ];
                const proc = spawn("ffmpeg", args, { stdio: "ignore" });
                proc.on("error", reject);
                proc.on("close", async (code) => {
                    if (code !== 0) {
                        reject(new Error("FFMPEG_FAILED"));
                        return;
                    }
                    try {
                        await fs.rename(tmpFile, outFile);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        }

        const outStat = await fs.stat(outFile);
        return new NextResponse(Readable.toWeb(fsSync.createReadStream(outFile)), {
            headers: {
                "Content-Type": "image/jpeg",
                "Content-Length": String(outStat.size),
                "Cache-Control": "private, max-age=86400",
                "ETag": etag
            }
        });
    } catch (error) {
        if (error?.code === "ENOENT") {
            return NextResponse.json({ success: false, code: "file_not_found" }, { status: 404 });
        }
        if (error?.message === "FFMPEG_FAILED") {
            return NextResponse.json({ success: false, code: "video_frame_extraction_failed" }, { status: 500 });
        }
        return NextResponse.json({ success: false, code: "internal_error" }, { status: 500 });
    }
}
