// app/api/qr/generate/route.js

import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getSiteUrl } from '@/lib/getSiteUrl';
import { getSession } from '@/lib/session';

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({
                success: false,
                message: 'Authentication required'
            }, { status: 401 });
        }

        const { id: userId } = session.user;
        const { type, items, currentPath } = await request.json();

        if (!type || !['download', 'upload'].includes(type)) {
            return NextResponse.json({
                success: false,
                message: 'Invalid type. Must be "download" or "upload"'
            }, { status: 400 });
        }

        // Generate a unique token for this QR code
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Save the QR token to database
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
                        userId, // Add userId to the data
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
            // Upload QR code
            await prisma.qrToken.create({
                data: {
                    token,
                    type: 'upload',
                    data: JSON.stringify({
                        userId, // Add userId to the data
                        targetPath: currentPath
                    }),
                    expiresAt
                }
            });
        }

        // Generate QR code URL
        let siteUrl;
        try {
            siteUrl = await getSiteUrl();
        } catch (error) {
            // Fallback for development or when headers are not available
            siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        }
        const qrUrl = `${siteUrl}/qr/${token}`;

        // Generate QR code image
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
        console.error('Error generating QR code:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to generate QR code'
        }, { status: 500 });
    }
}
