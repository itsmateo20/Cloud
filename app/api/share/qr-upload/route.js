// app/api/share/qr-upload/route.js

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { db } from '@/lib/db';

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

        // Verify token
        const qrToken = await db.qrToken.findUnique({
            where: { token }
        });

        if (!qrToken) {
            return NextResponse.json({
                success: false,
                message: 'Invalid token'
            }, { status: 400 });
        }

        if (new Date() > qrToken.expiresAt) {
            await db.qrToken.delete({ where: { id: qrToken.id } });
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

        // Create upload directory if it doesn't exist
        const uploadDir = join(process.cwd(), 'uploads', targetPath || '');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (error) {
            // Directory might already exist, that's fine
        }

        const uploadedFiles = [];

        for (const file of files) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Generate unique filename to avoid conflicts
            const timestamp = Date.now();
            const originalName = file.name;
            const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
            const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;

            let fileName = originalName;
            let filePath = join(uploadDir, fileName);
            let counter = 1;

            // Check if file exists and generate unique name
            while (true) {
                try {
                    await import('fs').then(fs => fs.promises.access(filePath));
                    // File exists, try next name
                    fileName = `${baseName} (${counter})${ext}`;
                    filePath = join(uploadDir, fileName);
                    counter++;
                } catch {
                    // File doesn't exist, use this name
                    break;
                }
            }

            await writeFile(filePath, buffer);

            // Save file info to database
            const relativePath = join(targetPath || '', fileName).replace(/\\/g, '/');

            // Create file record in database (for QR uploads, we don't require a user)
            try {
                await db.file.create({
                    data: {
                        name: fileName,
                        path: relativePath,
                        size: BigInt(buffer.length),
                        ownerId: 1, // Use a default user ID or create a system user
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
            } catch (dbError) {
                console.error('Error saving file to database:', dbError);
                // Continue even if database save fails
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
        });

    } catch (error) {
        console.error('Error uploading files via QR:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to upload files'
        }, { status: 500 });
    }
}
