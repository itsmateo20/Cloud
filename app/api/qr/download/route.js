// app/api/qr/download/route.js

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/db';
import archiver from 'archiver';

export async function POST(request) {
    try {
        const { token, path, downloadAll } = await request.json();

        if (!token) {
            return NextResponse.json({
                success: false,
                message: 'No token provided'
            }, { status: 400 });
        }

        // Verify token
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

        if (qrToken.type !== 'download') {
            return NextResponse.json({
                success: false,
                message: 'Invalid token type'
            }, { status: 400 });
        }

        const data = JSON.parse(qrToken.data);
        const { userId } = data; // Extract userId from token data

        if (!userId) {
            return NextResponse.json({
                success: false,
                message: 'Invalid token data: missing user information'
            }, { status: 400 });
        }

        if (downloadAll) {
            // Create a ZIP file with all items
            const archive = archiver('zip', { zlib: { level: 9 } });

            // Collect chunks in a buffer
            const chunks = [];

            return new Promise(async (resolve, reject) => {
                archive.on('data', (chunk) => chunks.push(chunk));
                archive.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(new Response(buffer, {
                        headers: {
                            'Content-Type': 'application/zip',
                            'Content-Disposition': 'attachment; filename="files.zip"'
                        }
                    }));
                });
                archive.on('error', (err) => reject(err));

                try {
                    // Add files to archive sequentially
                    for (const item of data.items) {
                        try {
                            const filePath = join(process.cwd(), 'uploads', String(userId), item.path);
                            console.log(`Attempting to read file: ${filePath}`); // Debug log
                            const fileBuffer = await readFile(filePath);
                            archive.append(fileBuffer, { name: item.name });
                            console.log(`Added file to archive: ${item.name}`); // Debug log
                        } catch (error) {
                            console.error(`Error adding file ${item.name} to archive:`, error);
                        }
                    }

                    // Finalize after all files are added
                    archive.finalize();
                } catch (error) {
                    reject(error);
                }
            });

        } else {
            // Download single file
            if (!path) {
                return NextResponse.json({
                    success: false,
                    message: 'No file path provided'
                }, { status: 400 });
            }

            const item = data.items.find(i => i.path === path);
            if (!item) {
                return NextResponse.json({
                    success: false,
                    message: 'File not found in token data'
                }, { status: 404 });
            }

            try {
                const filePath = join(process.cwd(), 'uploads', String(userId), item.path);
                const fileBuffer = await readFile(filePath);

                return new Response(fileBuffer, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `attachment; filename="${item.name}"`
                    }
                });

            } catch (error) {
                console.error('Error reading file:', error);
                return NextResponse.json({
                    success: false,
                    message: 'File not found or cannot be read'
                }, { status: 404 });
            }
        }

    } catch (error) {
        console.error('Error downloading files via QR:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to download files'
        }, { status: 500 });
    }
}
