// app/api/files/upload/complete/route.js

import { getSession } from "@/lib/session";
import { uploadSessionManager } from "@/lib/uploadSessionManager";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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

        const body = await req.json();
        const { uploadToken } = body;

        if (!uploadToken) {
            return NextResponse.json({
                success: false,
                code: 'missing_token',
                message: 'Upload token is required'
            }, { status: 400 });
        }

        // Get upload session
        const uploadSession = uploadSessionManager.getSession(uploadToken);
        if (!uploadSession) {
            return NextResponse.json({
                success: false,
                code: 'invalid_session',
                message: 'Invalid upload session'
            }, { status: 404 });
        }

        // Verify user owns this session
        if (uploadSession.userId !== session.user.id) {
            return NextResponse.json({
                success: false,
                code: 'unauthorized',
                message: 'Unauthorized access to upload session'
            }, { status: 403 });
        }

        // Check if all chunks are uploaded
        if (uploadSession.uploadedChunks.size !== uploadSession.chunkCount) {
            return NextResponse.json({
                success: false,
                code: 'incomplete_upload',
                message: `Missing chunks: ${uploadSession.chunkCount - uploadSession.uploadedChunks.size} remaining`,
                uploadedChunks: uploadSession.uploadedChunks.size,
                totalChunks: uploadSession.chunkCount
            }, { status: 400 });
        }

        try {
            // Assemble file from chunks
            const finalPath = uploadSession.finalPath;
            const writeStream = await fs.open(finalPath, 'w');

            let assembledSize = 0;

            // Write chunks in order
            for (let i = 0; i < uploadSession.chunkCount; i++) {
                const chunkPath = path.join(uploadSession.tempDir, `chunk_${i}`);

                try {
                    const chunkData = await fs.readFile(chunkPath);
                    await writeStream.write(chunkData);
                    assembledSize += chunkData.length;
                } catch (chunkError) {
                    await writeStream.close();

                    // Clean up partial file
                    await fs.unlink(finalPath).catch(() => { });

                    throw new Error(`Failed to read chunk ${i}: ${chunkError.message}`);
                }
            }

            await writeStream.close();

            // Verify file size
            const stats = await fs.stat(finalPath);
            if (stats.size !== uploadSession.fileSize) {
                // Clean up incomplete file
                await fs.unlink(finalPath).catch(() => { });

                throw new Error(
                    `File size mismatch. Expected: ${uploadSession.fileSize}, Got: ${stats.size}`
                );
            }

            // Set file modification time if provided
            if (uploadSession.lastModified) {
                try {
                    const modDate = new Date(uploadSession.lastModified);
                    await fs.utimes(finalPath, modDate, modDate);
                } catch (utimeError) {
                    console.warn('Failed to set file modification time:', utimeError);
                    // Don't fail the upload for this
                }
            }

            // Clean up temporary directory
            await fs.rm(uploadSession.tempDir, { recursive: true, force: true });

            // Remove session
            uploadSessionManager.deleteSession(uploadToken);

            return NextResponse.json({
                success: true,
                fileName: uploadSession.fileName,
                fileSize: stats.size,
                message: 'File uploaded successfully'
            });

        } catch (assemblyError) {
            console.error('File assembly error:', assemblyError);

            // Clean up temp directory
            await fs.rm(uploadSession.tempDir, { recursive: true, force: true }).catch(() => { });
            uploadSessionManager.deleteSession(uploadToken);

            return NextResponse.json({
                success: false,
                code: 'assembly_error',
                message: 'Failed to assemble file: ' + assemblyError.message
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Upload complete error:', error);
        return NextResponse.json({
            success: false,
            code: 'internal_error',
            message: 'Failed to complete upload'
        }, { status: 500 });
    }
}
