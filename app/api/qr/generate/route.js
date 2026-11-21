// app/api/qr/generate/route.js

import { NextResponse } from "next/server";
import QRCode from 'qrcode';
import crypto from 'crypto';
import { getSiteUrl } from '@/lib/getSiteUrl';
import { getSession } from '@/lib/session';
import { createQrToken } from '@/lib/qrTokens';
import { ensureShareTables, getShareByToken, canAccessShare } from '@/lib/shares';
import { canAccessSharedFolder } from '@/lib/sharedAccess';

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session?.success || !session?.user?.id) {
            return NextResponse.json({
                success: false,
                message: 'Authentication required'
            }, { status: 401 });
        }

        const { id: userId } = session.user;
        const authorizedEmail = session.user.email || session.user.googleEmail || session.user.githubEmail || session.user.discordEmail || "";
        const { type, items, currentPath, mode, shareId, shareToken, passcode } = await request.json();

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

            let sharedData = null;
            if (mode === 'sharedAccess') {
                const access = await canAccessSharedFolder(Number(shareId), userId, authorizedEmail);
                if (!access.ok) {
                    return NextResponse.json({ success: false, message: 'Shared folder access denied' }, { status: 403 });
                }
                sharedData = {
                    mode,
                    shareId: access.share.id,
                    ownerId: access.share.ownerId,
                    folderPath: access.share.folderPath,
                    authorizedEmail
                };
            } else if (mode === 'sharedToYou') {
                await ensureShareTables();
                const share = await getShareByToken(shareToken);
                const access = await canAccessShare(share, session, passcode || "");
                if (!access.ok) {
                    return NextResponse.json({ success: false, message: access.message || 'Share access denied' }, { status: access.status || 403 });
                }
                sharedData = {
                    mode,
                    shareToken,
                    passcode: passcode || "",
                    authorizedEmail
                };
            }

            await createQrToken({
                token,
                type: 'download',
                data: JSON.stringify({
                    userId,
                    ...sharedData,
                    items: items.map(item => ({
                        path: item.path,
                        name: item.name,
                        type: item.type
                    })),
                    currentPath
                }),
                expiresAt
            });
        } else {
            let sharedUploadData = null;
            if (mode === 'sharedAccess') {
                const access = await canAccessSharedFolder(Number(shareId), userId, authorizedEmail);
                if (!access.ok) {
                    return NextResponse.json({ success: false, message: 'Shared folder access denied' }, { status: 403 });
                }
                sharedUploadData = {
                    mode,
                    shareId: access.share.id,
                    ownerId: access.share.ownerId,
                    folderPath: access.share.folderPath,
                    targetPath: currentPath || "",
                    authorizedEmail
                };
            }
            await createQrToken({
                token,
                type: 'upload',
                data: JSON.stringify({
                    userId,
                    ...sharedUploadData,
                    targetPath: currentPath
                }),
                expiresAt
            });
        }
        let siteUrl;
        try {
            siteUrl = await getSiteUrl();
        } catch (error) {
            siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        }
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
