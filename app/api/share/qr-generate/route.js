// app/api/share/qr-generate/route.js

import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getSiteUrl } from '@/lib/getSiteUrl';

export async function POST(request) {
    try {
        const { type, items, currentPath } = await request.json();

        if (!type || !['download', 'upload'].includes(type)) {
            return NextResponse.json({
                success: false,
                message: 'Invalid type. Must be "download" or "upload"'
            }, { status: 400 });
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        if (type === 'download') {
            if (!items || items.length === 0) {
                return NextResponse.json({
                    success: false,
                    message: 'No items specified for download'
                }, { status: 400 });
            }

            await prisma.qrToken.create({
                data: {
                    token,
                    type: 'download',
                    data: JSON.stringify({
                        items: items.map(item => ({
                            path: item.path,
                            name: item.name,
                            type: item.type
                        })),
                        currentPath
                    }),
                    expiresAt
                }
            });
        } else {
            await prisma.qrToken.create({
                data: {
                    token,
                    type: 'upload',
                    data: JSON.stringify({
                        targetPath: currentPath
                    }),
                    expiresAt
                }
            });
        }
        const siteUrl = getSiteUrl();
        const qrUrl = `${siteUrl}/qr/${token}`;
        const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
            width: 200,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        return NextResponse.json({
            success: true,
            qrCode: qrCodeDataUrl,
            token,
            expiresAt: expiresAt.toISOString()
        });

    } catch (error) {

        return NextResponse.json({
            success: false,
            message: 'Failed to generate QR code'
        }, { status: 500 });
    }
}
