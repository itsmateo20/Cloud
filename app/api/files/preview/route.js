// app/api/files/preview/route.js

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getUserUploadPath } from "@/lib/paths";

export async function GET(req) {
    try {
        const url = new URL(req.url);
        let filePath = url.searchParams.get("path");
        const fileId = url.searchParams.get("fileId");

        let userId;
        let fileRecord;

        const session = await getSession();
        if (!session) {
            return NextResponse.json({
                success: false,
                code: "unauthorized"
            }, { status: 401 });
        }

        userId = session.user.id;
        const folderVerification = await verifyFolderOwnership(userId);
        if (!folderVerification.isValid) {
            return NextResponse.json({
                success: false,
                code: "folder_auth_failed",
                message: "Folder authentication failed: " + folderVerification.error
            }, { status: 403 });
        }

        if (filePath) {
            fileRecord = await prisma.file.findFirst({
                where: {
                    ownerId: userId,
                    path: filePath
                }
            });

            if (!fileRecord) {
                return NextResponse.json({
                    success: false,
                    code: "file_not_found"
                }, { status: 404 });
            }
        }

        if (!filePath || !userId) {
            return NextResponse.json({
                success: false,
                code: "invalid_parameters"
            }, { status: 400 });
        }

        const userFolder = getUserUploadPath(userId);
        const requestedPath = path.join(userFolder, filePath);

        if (!requestedPath.startsWith(userFolder)) {
            return NextResponse.json({
                success: false,
                code: "invalid_path"
            }, { status: 400 });
        }

    try {

        const stat = await fs.stat(requestedPath);
        if (stat.isDirectory()) {
            return NextResponse.json({
                success: false,
                code: "cannot_preview_directory"
            }, { status: 400 });
        }


        const fileBuffer = await fs.readFile(requestedPath);


        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';

        switch (ext) {
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.gif':
                contentType = 'image/gif';
                break;
            case '.svg':
                contentType = 'image/svg+xml';
                break;
            case '.webp':
                contentType = 'image/webp';
                break;
            case '.bmp':
                contentType = 'image/bmp';
                break;
            case '.pdf':
                contentType = 'application/pdf';
                break;
            case '.mp4':
                contentType = 'video/mp4';
                break;
            case '.webm':
                contentType = 'video/webm';
                break;
            case '.ogg':
                contentType = 'video/ogg';
                break;
            case '.mov':
                contentType = 'video/quicktime';
                break;
            case '.avi':
                contentType = 'video/x-msvideo';
                break;
            case '.mp3':
                contentType = 'audio/mpeg';
                break;
            case '.wav':
                contentType = 'audio/wav';
                break;
            case '.txt':
                contentType = 'text/plain';
                break;
            case '.html':
                contentType = 'text/html';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.js':
                contentType = 'application/javascript';
                break;
            case '.json':
                contentType = 'application/json';
                break;
            default:

                if (fileRecord?.type) {
                    contentType = fileRecord.type;
                }
        }


        return new Response(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': stat.size.toString(),
                'Cache-Control': 'public, max-age=3600',
                'Content-Security-Policy': "default-src 'self'",
                'X-File-Name': encodeURIComponent(fileRecord?.name || path.basename(filePath))
            }
        });

    } catch (fileError) {
        console.error("File preview error:", fileError);
        return NextResponse.json({
            success: false,
            code: "file_not_accessible",
            message: "Could not read file"
        }, { status: 404 });
    }

} catch (error) {
    console.error("Preview route error:", error);

    if (error.code === 'P2025') {
        return NextResponse.json({
            success: false,
            code: "not_found"
        }, { status: 404 });
    }

    return NextResponse.json({
        success: false,
        code: "internal_server_error",
        message: "Failed to preview file"
    }, { status: 500 });
    }
}