// app/api/files/stream/route.js

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { getUserUploadPath } from "@/lib/paths";

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const filePath = url.searchParams.get('path');
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
        }

        const { id: userId } = session.user;
        const folderVerification = await verifyFolderOwnership(userId);
        if (!folderVerification.isValid) {
            return NextResponse.json({
                success: false,
                code: "folder_auth_failed",
                message: "Folder authentication failed: " + folderVerification.error
            }, { status: 403 });
        }

        if (!filePath) {
            return NextResponse.json({
                success: false,
                code: "explorer_invalid_request",
                message: "File path is required"
            }, { status: 400 });
        }

        const userFolder = getUserUploadPath(userId);
        const requestedPath = path.join(userFolder, filePath);
        if (!requestedPath.startsWith(userFolder)) {
            return NextResponse.json({
                success: false,
                code: "explorer_invalid_path",
                message: "Invalid file path"
            }, { status: 403 });
        }

        return await streamFile(req, requestedPath);

    } catch (error) {

        return NextResponse.json({
            success: false,
            code: "explorer_stream_failed",
            message: "File streaming failed"
        }, { status: 500 });
    }
}

async function streamFile(req, filePath, fileName = null) {
    try {
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
            return NextResponse.json({
                success: false,
                code: "explorer_failed_stream_folder",
                message: "Cannot stream a folder"
            }, { status: 400 });
        }

        const range = req.headers.get('range');
        const fileSize = stat.size;
        const displayName = fileName || path.basename(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
            '.wmv': 'video/x-ms-wmv',
            '.mkv': 'video/x-matroska',
            '.m4v': 'video/mp4',
            '.flv': 'video/x-flv',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.flac': 'audio/flac',
            '.aac': 'audio/aac',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.bmp': 'image/bmp',
            '.pdf': 'application/pdf'
        }; const contentType = mimeTypes[ext] || 'application/octet-stream';
        const isVideo = contentType.startsWith('video/');
        const isSmallVideo = isVideo && fileSize < 50 * 1024 * 1024;

        if (range && !isSmallVideo) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            if (start >= fileSize || end >= fileSize || start > end) {
                return new Response('Range Not Satisfiable', { status: 416 });
            }
            const file = await fs.open(filePath, 'r');
            const buffer = Buffer.alloc(chunksize);
            const { bytesRead } = await file.read(buffer, 0, chunksize, start);
            await file.close();

            const headers = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': bytesRead.toString(),
                'Content-Type': contentType,
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Range, Content-Type'
            };

            return new Response(buffer.slice(0, bytesRead), {
                status: 206,
                headers
            });
        } else {
            const stream = createReadStream(filePath);
            const readableStream = new ReadableStream({
                start(controller) {
                    stream.on('data', (chunk) => {
                        controller.enqueue(new Uint8Array(chunk));
                    });

                    stream.on('end', () => {
                        controller.close();
                    });

                    stream.on('error', (error) => {
                        controller.error(error);
                    });
                },

                cancel() {
                    stream.destroy();
                }
            });

            const headers = {
                'Content-Length': fileSize.toString(),
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Range, Content-Type'
            };

            return new Response(readableStream, {
                status: 200,
                headers
            });
        }

    } catch (fileError) {

        if (fileError.code === 'ENOENT') {
            return NextResponse.json({
                success: false,
                code: "explorer_file_not_found",
                message: "File not found"
            }, { status: 404 });
        }

        return NextResponse.json({
            success: false,
            code: "explorer_file_invalid",
            message: "File streaming failed"
        }, { status: 500 });
    }
}

export async function OPTIONS(req) {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        }
    });
}
