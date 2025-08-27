// app/api/files/metadata/route.js

import { getSession } from "@/lib/session";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const filePath = url.searchParams.get('path');

        const session = await getSession();
        if (!session) {
            return NextResponse.json({
                success: false,
                code: 'unauthorized',
                message: 'Authentication required'
            }, { status: 401 });
        }

        const userId = session.user.id;
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
                code: 'missing_path',
                message: 'File path is required'
            }, { status: 400 });
        }

        const userFolder = path.join(process.cwd(), "uploads", String(userId));
        const requestedPath = path.join(userFolder, filePath);

        if (!requestedPath.startsWith(userFolder)) {
            return NextResponse.json({
                success: false,
                code: "explorer_invalid_path",
                message: "Invalid file path"
            }, { status: 400 });
        }

        try {
            const stat = await fs.stat(requestedPath);

            if (stat.isDirectory()) {
                return NextResponse.json({
                    success: false,
                    code: "is_directory",
                    message: "Path is a directory, not a file"
                }, { status: 400 });
            }

            return NextResponse.json({
                success: true,
                name: path.basename(requestedPath),
                size: stat.size,
                lastModified: stat.mtime.toISOString(),
                created: stat.birthtime.toISOString(),
                type: 'file'
            });

        } catch (fileError) {
            console.error("File metadata error:", fileError);

            if (fileError.code === 'ENOENT') {
                return NextResponse.json({
                    success: false,
                    code: "file_not_found",
                    message: "File not found"
                }, { status: 404 });
            }

            return NextResponse.json({
                success: false,
                code: "file_access_error",
                message: "Could not access file",
                error: fileError.message
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Metadata route error:', error);
        return NextResponse.json({
            success: false,
            code: 'internal_error',
            message: 'Failed to get file metadata'
        }, { status: 500 });
    }
}
