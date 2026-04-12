// app/api/files/preview/route.js

import { getSession } from "@/lib/session";
import prisma from "@/lib/db";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getUserUploadPath } from "@/lib/paths";
import { getMimeType } from "@/lib/mimeTypes";

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
            const mimeType = getMimeType(filePath);
            const contentType = mimeType === 'application/octet-stream' && fileRecord?.type ? fileRecord.type : mimeType;

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

            return NextResponse.json({
                success: false,
                code: "file_not_accessible",
                message: "Could not read file"
            }, { status: 404 });
        }

    } catch (error) {

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