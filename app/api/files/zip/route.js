// app/api/files/zip/route.js

import { getSession } from "@/lib/session";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import archiver from "archiver";
import { getUserUploadPath } from "@/lib/paths";

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
        const { files, zipName } = body;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return NextResponse.json({
                success: false,
                code: 'missing_files',
                message: 'Files list is required and must be a non-empty array'
            }, { status: 400 });
        }

        console.log(`ZIP request for ${files.length} files:`, files);

        const userFolder = getUserUploadPath(userId);
        const sanitizedZipName = (zipName || 'download').replace(/[^a-zA-Z0-9_-]/g, '_') + '.zip';

        // Validate all file paths
        const validatedFiles = [];
        for (const filePath of files) {
            if (!filePath || typeof filePath !== 'string') {
                console.warn(`Invalid file path:`, filePath);
                continue;
            }

            const requestedPath = path.join(userFolder, filePath);

            if (!requestedPath.startsWith(userFolder)) {
                console.warn(`Path outside user folder: ${filePath}`);
                return NextResponse.json({
                    success: false,
                    code: "invalid_path",
                    message: `Invalid file path: ${filePath}`
                }, { status: 400 });
            }

            try {
                const stat = await fs.stat(requestedPath);

                if (stat.isFile()) {
                    validatedFiles.push({
                        filePath,
                        fullPath: requestedPath,
                        size: stat.size,
                        mtime: stat.mtime
                    });
                    console.log(`Validated file: ${filePath} (${stat.size} bytes)`);
                } else {
                    console.warn(`Skipping non-file: ${filePath}`);
                }
            } catch (error) {
                console.warn(`File not accessible: ${filePath}`, error.code);
                // Continue with other files instead of failing
            }
        }

        if (validatedFiles.length === 0) {
            return NextResponse.json({
                success: false,
                code: 'no_valid_files',
                message: 'No valid files found'
            }, { status: 400 });
        }

        // Create ZIP stream
        const archive = archiver('zip', {
            zlib: { level: 6 } // Compression level
        });

        let archiveFinalized = false;
        let hasError = false;

        // Set up readable stream
        const readableStream = new ReadableStream({
            start(controller) {
                // Handle archive events
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
                    console.error('Archive error:', error);
                    hasError = true;
                    controller.error(error);
                });

                archive.on('warning', (warning) => {
                    console.warn('Archive warning:', warning);
                });

                // Add files to archive sequentially to avoid memory issues
                const addFilesToArchive = async () => {
                    try {
                        for (const file of validatedFiles) {
                            if (hasError) break;

                            const fileName = path.basename(file.filePath);
                            const relativePath = file.filePath.replace(/\\/g, '/'); // Normalize path separators

                            console.log(`Adding file to ZIP: ${fileName} (${file.size} bytes)`);

                            try {
                                const stream = createReadStream(file.fullPath);

                                // Handle stream errors
                                stream.on('error', (streamError) => {
                                    console.error(`Stream error for ${fileName}:`, streamError);
                                    // Continue with next file instead of failing entire archive
                                });

                                archive.append(stream, {
                                    name: fileName,
                                    date: file.mtime
                                });

                            } catch (fileError) {
                                console.error(`Error adding file ${fileName}:`, fileError);
                                // Continue with next file
                            }
                        }

                        // Finalize the archive
                        if (!hasError && !archiveFinalized) {
                            archiveFinalized = true;
                            console.log('Finalizing ZIP archive...');
                            await archive.finalize();
                        }

                    } catch (error) {
                        console.error('Error in addFilesToArchive:', error);
                        hasError = true;
                        controller.error(error);
                    }
                };

                // Start adding files
                addFilesToArchive();
            },

            cancel() {
                console.log('ZIP stream cancelled');
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
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('ZIP creation error:', error);
        return NextResponse.json({
            success: false,
            code: 'internal_error',
            message: 'Failed to create ZIP file'
        }, { status: 500 });
    }
}
