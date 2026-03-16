// app/api/files/upload/chunk/route.js

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

        const headerUploadToken = req.headers.get('x-upload-token');
        const headerChunkNumber = req.headers.get('x-chunk-number');

        let uploadToken = headerUploadToken;
        let chunkNumber = Number.parseInt(headerChunkNumber ?? '', 10);
        let chunkBuffer = null;

        if (headerUploadToken && Number.isFinite(chunkNumber)) {
            const arrayBuffer = await req.arrayBuffer();
            chunkBuffer = Buffer.from(arrayBuffer);
        } else {
            const formData = await req.formData();
            const chunk = formData.get('chunk');
            chunkNumber = Number.parseInt(formData.get('chunkNumber'), 10);
            uploadToken = formData.get('uploadToken');

            if (chunk && typeof chunk.arrayBuffer === 'function') {
                const arrayBuffer = await chunk.arrayBuffer();
                chunkBuffer = Buffer.from(arrayBuffer);
            }
        }

        if (!chunkBuffer || Number.isNaN(chunkNumber) || !uploadToken) {
            return NextResponse.json({
                success: false,
                code: 'missing_parameters',
                message: 'Missing required parameters'
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

        if (new Date() > uploadSession.expiresAt) {
            uploadSessionManager.deleteSession(uploadToken);
            return NextResponse.json({
                success: false,
                code: 'session_expired',
                message: 'Upload session expired'
            }, { status: 410 });
        }

        if (chunkNumber < 0 || chunkNumber >= uploadSession.chunkCount) {
            return NextResponse.json({
                success: false,
                code: 'invalid_chunk_number',
                message: 'Invalid chunk number'
            }, { status: 400 });
        }

        if (uploadSession.uploadedChunks.has(chunkNumber)) return NextResponse.json({
            success: true,
            message: 'Chunk already uploaded',
            chunkNumber
        });

        const chunkPath = path.join(uploadSession.tempDir, `chunk_${chunkNumber}`);

        try {
            await fs.writeFile(chunkPath, chunkBuffer);

            uploadSession.uploadedChunks.add(chunkNumber);

            return NextResponse.json({
                success: true,
                chunkNumber,
                uploadedChunks: uploadSession.uploadedChunks.size,
                totalChunks: uploadSession.chunkCount,
                isComplete: uploadSession.uploadedChunks.size === uploadSession.chunkCount
            });

        } catch (error) {

            return NextResponse.json({
                success: false,
                code: 'chunk_write_error',
                message: 'Failed to write chunk'
            }, { status: 500 });
        }

    } catch (error) {

        return NextResponse.json({
            success: false,
            code: 'internal_error',
            message: 'Failed to upload chunk'
        }, { status: 500 });
    }
}
