// app/api/qr/download/route.js

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import prisma from '@/lib/db';
import archiver from 'archiver';
import { getUserUploadPath } from '@/lib/paths';

export async function POST(request) {
    try {
        const { token, path, downloadAll } = await request.json();

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

        if (qrToken.type !== 'download') {
            return NextResponse.json({
                success: false,
                message: 'Invalid token type'
            }, { status: 400 });
        }

        const data = JSON.parse(qrToken.data);
        const { userId } = data;

        if (!userId) {
            return NextResponse.json({
                success: false,
                message: 'Invalid token data: missing user information'
            }, { status: 400 });
        }

        if (downloadAll) {
            const archive = archiver('zip', { zlib: { level: 9 } });

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
                    for (const item of data.items) {
                        try {
                            const filePath = join(getUserUploadPath(userId), item.path);

                            const fileBuffer = await readFile(filePath);
                            archive.append(fileBuffer, { name: item.name });

                        } catch (error) {

                        }
                    }

                    archive.finalize();
                } catch (error) {
                    reject(error);
                }
            });

        } else {
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
                const filePath = join(getUserUploadPath(userId), item.path);
                const fileBuffer = await readFile(filePath);

                return new Response(fileBuffer, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `attachment; filename="${item.name}"`
                    }
                });

            } catch (error) {

                return NextResponse.json({
                    success: false,
                    message: 'File not found or cannot be read'
                }, { status: 404 });
            }
        }

    } catch (error) {

        return NextResponse.json({
            success: false,
            message: 'Failed to download files'
        }, { status: 500 });
    }
}
