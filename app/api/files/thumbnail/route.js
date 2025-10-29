// app/api/files/thumbnail/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import sharp from "sharp";
import fsSync from 'fs';
import { getUserUploadPath } from "@/lib/paths";

export async function GET(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");
    const sizeParam = (searchParams.get('size') || 'medium').toLowerCase();
    const sizeMap = { small: 96, medium: 128, large: 256 };
    const targetSize = sizeMap[sizeParam] || sizeMap.medium;

    if (!filePath) {
        return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

    try {
        const { id: userId } = session.user;
        const userFolder = getUserUploadPath(userId);
        const fullPath = path.join(userFolder, filePath);
        if (!fullPath.startsWith(userFolder)) {
            return NextResponse.json({ error: "Invalid file path" }, { status: 403 });
        }
        try {
            await fs.access(fullPath);
        } catch {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const fileExtension = path.extname(filePath).toLowerCase();
        const stat = await fs.stat(fullPath);
        const sourceMTimeMs = stat.mtimeMs;
        const etag = `"${sourceMTimeMs}-img-${targetSize}"`;

        const ifNoneMatch = req.headers.get('if-none-match');
        if (ifNoneMatch && ifNoneMatch === etag) {
            return new NextResponse(null, { status: 304, headers: { 'ETag': etag } });
        }
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(fileExtension);
        const isVideo = ['.mp4', '.avi', '.mov', '.wmv', '.webm', '.mkv'].includes(fileExtension);

        if (isImage) {
            try {
                const thumbnailsDir = path.join(userFolder, '.thumbnails');
                const relativeSafe = filePath.startsWith('/') ? filePath.slice(1) : filePath;
                const cacheFile = path.join(thumbnailsDir, relativeSafe + `.thumb.${targetSize}.jpg`);
                await fs.mkdir(path.dirname(cacheFile), { recursive: true });

                let useCached = false;
                if (fsSync.existsSync(cacheFile)) {
                    try {
                        const cacheStat = await fs.stat(cacheFile);
                        if (cacheStat.mtimeMs >= sourceMTimeMs) {
                            useCached = true;
                        }
                    } catch { /* ignore */ }
                }

                if (!useCached) {
                    const imageBuffer = await fs.readFile(fullPath);
                    const pipeline = sharp(imageBuffer).resize(targetSize, targetSize, { fit: 'cover', position: 'center' }).jpeg({ quality: targetSize <= 96 ? 60 : 72, mozjpeg: true });
                    const outBuffer = await pipeline.toBuffer();
                    await fs.writeFile(cacheFile, outBuffer);
                }

                const fileStream = await fs.readFile(cacheFile);
                return new NextResponse(fileStream, {
                    headers: {
                        'Content-Type': 'image/jpeg',
                        'Cache-Control': 'public, max-age=2592000, immutable', // 30 days + immutable
                        'ETag': etag,
                        'Expires': new Date(Date.now() + 2592000000).toUTCString()
                    }
                });
            } catch (error) {

                return NextResponse.json({ error: 'Failed to generate thumbnail' }, { status: 500 });
            }
        } else if (isVideo) {
            const placeholderSvg = `
                <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
                    <rect width="64" height="64" fill="#f0f0f0"/>
                    <text x="32" y="40" text-anchor="middle" font-family="Arial" font-size="24">🎬</text>
                </svg>
            `;
            return new NextResponse(placeholderSvg, {
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'public, max-age=604800',
                    'ETag': etag
                },
            });
        } else {
            return NextResponse.json({ error: "File type not supported for thumbnails" }, { status: 400 });
        }

    } catch (error) {

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
