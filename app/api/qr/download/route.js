// app/api/qr/download/route.js

import { NextResponse } from 'next/server';
import { readFile, stat, readdir } from 'fs/promises';
import { join } from 'path';
import path from 'path';
import { ZipArchive } from 'archiver';
import { getUserUploadPath } from '@/lib/paths';
import { deleteQrTokenById, findQrTokenByToken } from '@/lib/qrTokens';
import sanitizeFilename from 'sanitize-filename';
import { resolvePathWithinBase } from '@/lib/paths';
import { ensureShareTables, getShareByToken, canAccessShare } from '@/lib/shares';
import { canAccessSharedFolder } from '@/lib/sharedAccess';

async function collectFiles(dirPath, basePath = '') {
    const files = [];
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.join(basePath, entry.name);
        if (entry.isDirectory()) files.push(...await collectFiles(fullPath, relativePath));
        else if (entry.isFile()) files.push({ fullPath, relativePath: relativePath.replace(/\\/g, '/') });
    }
    return files;
}

function buildZip(files) {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const chunks = [];
    return new Promise((resolve, reject) => {
        archive.on('data', (chunk) => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', reject);
        try {
            (async () => {
                for (const file of files) {
                    const buffer = await readFile(file.fullPath);
                    archive.append(buffer, { name: file.relativePath });
                }
                await archive.finalize();
            })().catch(reject);
        } catch (error) {
            reject(error);
        }
    });
}

export async function POST(request) {
    try {
        const { token, path: requestedPath, downloadAll } = await request.json();

        if (!token) {
            return NextResponse.json({
                success: false,
                message: 'No token provided'
            }, { status: 400 });
        }

        const qrToken = await findQrTokenByToken(token);

        if (!qrToken) {
            return NextResponse.json({
                success: false,
                message: 'Invalid token'
            }, { status: 400 });
        }

        if (new Date() > qrToken.expiresAt) {
            await deleteQrTokenById(qrToken.id);
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

        if (data.mode === 'sharedAccess' || data.mode === 'sharedToYou') {
            let selectedItems = data.items || [];
            if (requestedPath && !downloadAll) {
                selectedItems = selectedItems.filter((item) => item.path === requestedPath);
            }
            const zipFiles = [];

            if (data.mode === 'sharedAccess') {
                const access = await canAccessSharedFolder(Number(data.shareId), Number(userId), data.authorizedEmail || '');
                if (
                    !access.ok ||
                    Number(access.share.ownerId) !== Number(data.ownerId) ||
                    access.share.folderPath !== data.folderPath
                ) {
                    return NextResponse.json({ success: false, message: 'Shared folder access denied' }, { status: 403 });
                }
                const ownerFolder = getUserUploadPath(access.share.ownerId);
                const source = resolvePathWithinBase(ownerFolder, access.share.folderPath);
                if (!source.isInside || access.share.folderPath === '.private' || access.share.folderPath.startsWith('.private/')) {
                    return NextResponse.json({ success: false, message: 'Invalid shared folder' }, { status: 403 });
                }
                for (const item of selectedItems) {
                    const resolution = resolvePathWithinBase(ownerFolder, item.path);
                    if (!resolution.isInside) continue;
                    const relative = path.relative(source.resolvedPath, resolution.resolvedPath);
                    if (
                        relative === '' ||
                        relative === '..' ||
                        relative.startsWith(`..${path.sep}`) ||
                        path.isAbsolute(relative)
                    ) continue;
                    const itemStat = await stat(resolution.resolvedPath).catch(() => null);
                    if (!itemStat) continue;
                    if (itemStat.isDirectory()) {
                        const nested = await collectFiles(resolution.resolvedPath, sanitizeFilename(path.basename(resolution.resolvedPath)) || 'folder');
                        zipFiles.push(...nested);
                    } else if (itemStat.isFile()) {
                        zipFiles.push({ fullPath: resolution.resolvedPath, relativePath: sanitizeFilename(item.name) || path.basename(resolution.resolvedPath) });
                    }
                }
            } else {
                await ensureShareTables();
                const share = await getShareByToken(data.shareToken);
                const access = await canAccessShare(
                    share,
                    { user: { id: userId, email: data.authorizedEmail || '' } },
                    data.passcode || ''
                );
                if (!access.ok) {
                    return NextResponse.json({ success: false, message: 'Share access denied' }, { status: 403 });
                }
                const ownerFolder = getUserUploadPath(share.ownerId);
                for (const item of selectedItems) {
                    const resolution = resolvePathWithinBase(ownerFolder, item.path);
                    if (!resolution.isInside) continue;
                    const matched = (share.items || []).some((shareItem) =>
                        item.path === shareItem.path ||
                        (shareItem.type === 'folder' && item.path.startsWith(`${shareItem.path}/`))
                    );
                    if (!matched) continue;
                    const itemStat = await stat(resolution.resolvedPath).catch(() => null);
                    if (!itemStat) continue;
                    if (itemStat.isDirectory()) {
                        const nested = await collectFiles(resolution.resolvedPath, sanitizeFilename(path.basename(resolution.resolvedPath)) || 'folder');
                        zipFiles.push(...nested);
                    } else if (itemStat.isFile()) {
                        zipFiles.push({ fullPath: resolution.resolvedPath, relativePath: sanitizeFilename(item.name) || path.basename(resolution.resolvedPath) });
                    }
                }
            }

            if (!zipFiles.length) {
                return NextResponse.json({ success: false, message: 'No downloadable files found' }, { status: 404 });
            }
            if (!requestedPath || !downloadAll) {
                if (zipFiles.length === 1 && selectedItems.length === 1 && selectedItems[0].type === 'file') {
                    const file = zipFiles[0];
                    const fileBuffer = await readFile(file.fullPath);
                    return new Response(fileBuffer, {
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'Content-Disposition': `attachment; filename="${encodeURIComponent(path.basename(file.relativePath))}"`
                        }
                    });
                }
            }
            const buffer = await buildZip(zipFiles);
            return new Response(buffer, {
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': 'attachment; filename="shared-selection.zip"'
                }
            });
        }

        if (downloadAll) {
            const archive = new ZipArchive({ zlib: { level: 9 } });

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
                            archive.append(fileBuffer, { name: sanitizeFilename(item.name) || item.name || 'file' });

                        } catch (error) {

                        }
                    }

                    archive.finalize();
                } catch (error) {
                    reject(error);
                }
            });

        } else {
            if (!requestedPath) {
                return NextResponse.json({
                    success: false,
                    message: 'No file path provided'
                }, { status: 400 });
            }

            const item = data.items.find(i => i.path === requestedPath);
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
                        'Content-Disposition': `attachment; filename="${encodeURIComponent(sanitizeFilename(item.name) || item.name || 'file')}"`
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
