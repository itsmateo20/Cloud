// app/api/files/thumbnail/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import sharp from "sharp";

export async function GET(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
        return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

    try {
        const { id: userId } = session.user;
        const userFolder = path.join(process.cwd(), "uploads", String(userId));
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
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(fileExtension);
        const isVideo = ['.mp4', '.avi', '.mov', '.wmv', '.webm', '.mkv'].includes(fileExtension);

        if (isImage) {
            try {
                const imageBuffer = await fs.readFile(fullPath);
                const thumbnail = await sharp(imageBuffer)
                    .resize(64, 64, {
                        fit: 'cover',
                        position: 'center'
                    })
                    .jpeg({ quality: 60 })
                    .toBuffer();

                return new NextResponse(thumbnail, {
                    headers: {
                        'Content-Type': 'image/jpeg',
                        'Cache-Control': 'public, max-age=31536000',
                    },
                });
            } catch (error) {
                console.error('Error generating image thumbnail:', error);
                return NextResponse.json({ error: "Failed to generate thumbnail" }, { status: 500 });
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
                    'Cache-Control': 'public, max-age=31536000',
                },
            });
        } else {
            return NextResponse.json({ error: "File type not supported for thumbnails" }, { status: 400 });
        }

    } catch (error) {
        console.error("Thumbnail generation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
