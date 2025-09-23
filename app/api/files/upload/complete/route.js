// app/api/files/upload/complete/route.js

import { getSession } from "@/lib/session";
import { uploadSessionManager } from "@/lib/uploadSessionManager";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { ensureUserUploadPath, getUserUploadPath } from "@/lib/paths";

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

        const uploadSession = uploadSessionManager.getSession(uploadToken);
        if (!uploadSession) {
            return NextResponse.json({
                success: false,
                code: 'invalid_session',
                message: 'Invalid upload session'
            }, { status: 404 });
        }

        if (uploadSession.userId !== session.user.id) {
            return NextResponse.json({
                success: false,
                code: 'unauthorized',
                message: 'Unauthorized access to upload session'
            }, { status: 403 });
        }

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
            const finalPath = uploadSession.finalPath;

            const pathResult = await ensureUserUploadPath(uploadSession.userId);
            if (!pathResult.success) {
                throw new Error(`Failed to create upload directory: ${pathResult.error}`);
            }

            const targetDir = path.dirname(finalPath);
            await fs.mkdir(targetDir, { recursive: true });

            const writeStream = await fs.open(finalPath, 'w');

            let assembledSize = 0;

            for (let i = 0; i < uploadSession.chunkCount; i++) {
                const chunkPath = path.join(uploadSession.tempDir, `chunk_${i}`);

                try {
                    const chunkData = await fs.readFile(chunkPath);
                    await writeStream.write(chunkData);
                    assembledSize += chunkData.length;
                } catch (chunkError) {
                    await writeStream.close();

                    await fs.unlink(finalPath).catch(() => { });

                    throw new Error(`Failed to read chunk ${i}: ${chunkError.message}`);
                }
            }

            await writeStream.close();

            const stats = await fs.stat(finalPath);
            if (stats.size !== uploadSession.fileSize) {
                await fs.unlink(finalPath).catch(() => { });

                throw new Error(
                    `File size mismatch. Expected: ${uploadSession.fileSize}, Got: ${stats.size}`
                );
            }

            if (uploadSession.lastModified) {
                try {
                    const modDate = new Date(uploadSession.lastModified);
                    await fs.utimes(finalPath, modDate, modDate);
                } catch (utimeError) { }
            }

            await fs.rm(uploadSession.tempDir, { recursive: true, force: true });

            uploadSessionManager.deleteSession(uploadToken);

            return NextResponse.json({
                success: true,
                fileName: uploadSession.fileName,
                fileSize: stats.size,
                message: 'File uploaded successfully'
            });

        } catch (assemblyError) {

            await fs.rm(uploadSession.tempDir, { recursive: true, force: true }).catch(() => { });
            uploadSessionManager.deleteSession(uploadToken);

            return NextResponse.json({
                success: false,
                code: 'assembly_error',
                message: 'Failed to assemble file: ' + assemblyError.message
            }, { status: 500 });
        }

    } catch (error) {

        return NextResponse.json({
            success: false,
            code: 'internal_error',
            message: 'Failed to complete upload'
        }, { status: 500 });
    }
}
