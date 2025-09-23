// app/api/share/qr-upload/route.js

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/db';
import { ensureUploadBasePath } from '@/lib/paths';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files');
        const token = formData.get('token');
        const targetPath = formData.get('targetPath');

        if (!token) {
            return NextResponse.json({
                success: false,
                message: 'No token provided'
            }, { status: 400 });
        }

        const qrToken = await prisma.qrToken.findUnique({
            where: { token }
        });

        if (!qrToken) {
            return NextResponse.json({
                success: false,
                message: 'Invalid token'
            }, { status: 400 });
        }

        if (new Date() > qrToken.expiresAt) {
            await prisma.qrToken.delete({ where: { id: qrToken.id } });
            return NextResponse.json({
                success: false,
                message: 'Token expired'
            }, { status: 400 });
        }

        if (qrToken.type !== 'upload') {
            return NextResponse.json({
                success: false,
                message: 'Invalid token type'
            }, { status: 400 });
        }

        if (!files || files.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No files provided'
            }, { status: 400 });
        }

        const basePathResult = await ensureUploadBasePath();
        if (!basePathResult.success) {
            return NextResponse.json({
                success: false,
                message: `Failed to create upload directory: ${basePathResult.error}`
            }, { status: 500 });
        }

        const uploadDir = join(basePathResult.path, targetPath || '');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (error) {
        }

        const uploadedFiles = [];

        for (const file of files) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const timestamp = Date.now();
            const originalName = file.name;
            const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
            const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;

            let fileName = originalName;
            let filePath = join(uploadDir, fileName);
            let counter = 1;

            while (true) {
                try {
                    await import('fs').then(fs => fs.promises.access(filePath));
                    fileName = `${baseName} (${counter})${ext}`;
                    filePath = join(uploadDir, fileName);
                    counter++;
                } catch {
                    break;
                }
            }

            await writeFile(filePath, buffer);

            const relativePath = join(targetPath || '', fileName).replace(/\\/g, '/');

            try {
                await prisma.file.create({
                    data: {
                        name: fileName,
                        path: relativePath,
                        size: BigInt(buffer.length),
                        ownerId: 1,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
            } catch (dbError) {

            }

            uploadedFiles.push({
                name: fileName,
                size: buffer.length,
                path: relativePath
            });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
            files: uploadedFiles
        }, { status: 200 });

    } catch (error) {

        return NextResponse.json({
            success: false,
            message: 'Failed to upload files'
        }, { status: 500 });
    }
}
