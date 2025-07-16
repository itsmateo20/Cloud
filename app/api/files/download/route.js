// app/api/files/download/route.js

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const fileId = url.searchParams.get('fileId');
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
                    code: "explorer_failed_download_folder",
                    message: "Cannot download a folder"
                }, { status: 400 });
            }

            const fileStat = await fs.stat(requestedPath);
            const fileName = path.basename(requestedPath);

            let displayName = fileName;
            try {
                const fileRecord = await prisma.file.findFirst({
                    where: {
                        ownerId: userId,
                        path: filePath
                    },
                    select: { name: true }
                });

                if (fileRecord?.name) {
                    displayName = fileRecord.name;
                }
            } catch (dbError) {
                console.error('Could not fetch file record:', dbError);
            }
            const stream = createReadStream(requestedPath);
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

            return new Response(readableStream, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${encodeURIComponent(displayName)}"`,
                    'Content-Length': fileStat.size.toString(),
                    'Cache-Control': 'no-cache'
                }
            });

        } catch (fileError) {
            console.error("File download error:", fileError);

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
                message: "Could not access file",
                error: fileError.message
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Download route error:', error);
        return NextResponse.json({
            success: false,
            code: 'internal_error',
            message: 'Failed to process download'
        }, { status: 500 });
    }
}