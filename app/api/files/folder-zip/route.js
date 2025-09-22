// app/api/files/folder-zip/route.js

import { getSession } from "@/lib/session";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import archiver from "archiver";
import { getUserUploadPath } from "@/lib/paths";

async function getAllFilesInDirectory(dirPath, basePath = '') {
    const files = [];

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = path.join(basePath, entry.name);

            if (entry.isDirectory()) {
                const subFiles = await getAllFilesInDirectory(fullPath, relativePath);
                files.push(...subFiles);
            } else if (entry.isFile()) {
                const stat = await fs.stat(fullPath);
                files.push({
                    fullPath,
                    relativePath: relativePath.replace(/\\/g, '/'),
                    name: entry.name,
                    size: stat.size,
                    mtime: stat.mtime
                });
            }
        }
    } catch (error) {

    }

    return files;
}

export async function POST(req) {
    try {
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

        const body = await req.json();
        const { folderPath, zipName } = body;

        if (!folderPath) {
            return NextResponse.json({
                success: false,
                code: 'missing_folder_path',
                message: 'Folder path is required'
            }, { status: 400 });
        }

        const userFolder = getUserUploadPath(userId);
        const targetFolderPath = path.join(userFolder, folderPath);

        if (!targetFolderPath.startsWith(userFolder)) {
            return NextResponse.json({
                success: false,
                code: "invalid_path",
                message: "Invalid folder path"
            }, { status: 400 });
        }

        try {
            const stat = await fs.stat(targetFolderPath);
            if (!stat.isDirectory()) {
                return NextResponse.json({
                    success: false,
                    code: 'not_a_directory',
                    message: 'Path is not a directory'
                }, { status: 400 });
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                return NextResponse.json({
                    success: false,
                    code: 'folder_not_found',
                    message: 'Folder not found'
                }, { status: 404 });
            }
            throw error;
        }

        const allFiles = await getAllFilesInDirectory(targetFolderPath);

        if (allFiles.length === 0) {
            return NextResponse.json({
                success: false,
                code: 'empty_folder',
                message: 'Folder is empty'
            }, { status: 400 });
        }

        const totalSize = allFiles.reduce((sum, file) => sum + file.size, 0);

        const sanitizedZipName = (zipName || path.basename(folderPath) || 'folder').replace(/[^a-zA-Z0-9_-]/g, '_') + '.zip';

        const archive = archiver('zip', {
            zlib: { level: 1 }
        });

        let archiveFinalized = false;
        let hasError = false;
        let processedBytes = 0;

        const readableStream = new ReadableStream({
            start(controller) {
                archive.on('data', (chunk) => {
                    if (!hasError) {
                        controller.enqueue(new Uint8Array(chunk));
                    }
                });

                archive.on('end', () => {
                    if (!hasError) {
                        controller.close();
                    }
                });

                archive.on('error', (error) => {

                    hasError = true;
                    controller.error(error);
                });

                archive.on('warning', (warning) => {

                });

                const addFilesToArchive = async () => {
                    try {
                        for (const file of allFiles) {
                            if (hasError) break;

                            try {
                                const stream = createReadStream(file.fullPath);

                                stream.on('error', (streamError) => {

                                });

                                archive.append(stream, {
                                    name: file.relativePath,
                                    date: file.mtime
                                });

                            } catch (fileError) {

                            }
                        }

                        if (!hasError && !archiveFinalized) {
                            archiveFinalized = true;

                            await archive.finalize();
                        }

                    } catch (error) {

                        hasError = true;
                        controller.error(error);
                    }
                };

                addFilesToArchive();
            },

            cancel() {

                hasError = true;
                if (!archiveFinalized) {
                    archive.destroy();
                }
            }
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(sanitizedZipName)}"`,
                'Cache-Control': 'no-cache',
                'Transfer-Encoding': 'chunked',
                'X-Total-Files': allFiles.length.toString(),
                'X-Total-Size': totalSize.toString()
            }
        });

    } catch (error) {

        return NextResponse.json({
            success: false,
            code: 'internal_error',
            message: 'Failed to create folder ZIP'
        }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const folderPath = url.searchParams.get('path');

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

        if (!folderPath) {
            return NextResponse.json({
                success: false,
                code: 'missing_folder_path',
                message: 'Folder path is required'
            }, { status: 400 });
        }

        const userFolder = getUserUploadPath(userId);
        const targetFolderPath = path.join(userFolder, folderPath);

        if (!targetFolderPath.startsWith(userFolder)) {
            return NextResponse.json({
                success: false,
                code: "invalid_path",
                message: "Invalid folder path"
            }, { status: 400 });
        }

        try {
            const stat = await fs.stat(targetFolderPath);
            if (!stat.isDirectory()) {
                return NextResponse.json({
                    success: false,
                    code: 'not_a_directory',
                    message: 'Path is not a directory'
                }, { status: 400 });
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                return NextResponse.json({
                    success: false,
                    code: 'folder_not_found',
                    message: 'Folder not found'
                }, { status: 404 });
            }
            throw error;
        }

        const files = await getAllFilesInDirectory(targetFolderPath, '');

        if (files.length === 0) {
            return NextResponse.json({
                success: false,
                code: 'empty_folder',
                message: 'Folder is empty'
            }, { status: 400 });
        }

        const folderName = path.basename(folderPath) || 'folder';
        const sanitizedZipName = folderName.replace(/[^a-zA-Z0-9_-]/g, '_') + '.zip';

        const totalSize = files.reduce((sum, file) => sum + file.size, 0);

        const archive = archiver('zip', {
            zlib: { level: 1 }
        });

        let archiveFinalized = false;
        let hasError = false;
        let processedBytes = 0;

        const readableStream = new ReadableStream({
            start(controller) {
                archive.on('data', (chunk) => {
                    if (!hasError) {
                        controller.enqueue(new Uint8Array(chunk));
                    }
                });

                archive.on('end', () => {
                    if (!hasError) {
                        controller.close();
                    }
                });

                archive.on('error', (error) => {

                    hasError = true;
                    controller.error(error);
                });

                archive.on('warning', (warning) => {

                });

                const addFilesToArchive = async () => {
                    try {
                        for (const file of files) {
                            if (hasError) break;

                            try {
                                const stream = createReadStream(file.fullPath);

                                stream.on('error', (streamError) => {

                                });

                                archive.append(stream, {
                                    name: file.relativePath,
                                    date: file.mtime
                                });

                            } catch (fileError) {

                            }
                        }

                        if (!hasError && !archiveFinalized) {
                            archiveFinalized = true;

                            await archive.finalize();
                        }

                    } catch (error) {

                        hasError = true;
                        controller.error(error);
                    }
                };

                addFilesToArchive();
            },

            cancel() {

                hasError = true;
                if (!archiveFinalized) {
                    archive.destroy();
                }
            }
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(sanitizedZipName)}"`,
                'Cache-Control': 'no-cache',
                'Transfer-Encoding': 'chunked',
                'X-Total-Files': files.length.toString(),
                'X-Total-Size': totalSize.toString()
            }
        });

    } catch (error) {

        return NextResponse.json({
            success: false,
            code: 'internal_error',
            message: 'Failed to create folder ZIP'
        }, { status: 500 });
    }
}
