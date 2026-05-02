// app/api/files/create/route.js

import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { verifyFolderOwnership, initializeUserFolder } from '@/lib/folderAuth';
import { getSession } from '@/lib/session';
import { ensureUserUploadPath, resolvePathWithinBase } from '@/lib/paths';
import { normalizeRelativeUploadPath } from '@/utils/uploadPath';

function validateName(name) {
    if (!name || typeof name !== 'string') return 'missing_name';
    const trimmed = name.trim();
    if (!trimmed) return 'empty_name';
    if (trimmed.length > 255) return 'name_too_long';
    if (/[\\/:*?"<>|]/.test(trimmed)) return 'illegal_chars';
    if (trimmed.includes('..')) return 'dotdot_not_allowed';
    return null;
}

export async function POST(req) {
    try {
        const session = await getSession();
        if (!session?.success) {
            return NextResponse.json({ success: false, code: 'unauthorized', message: 'Not authenticated' }, { status: 401 });
        }
        const userId = session.user.id;

        const body = await req.json();
        const { name, type, currentPath = '' } = body || {};

        const validationCode = validateName(name);
        if (validationCode) {
            return NextResponse.json({ success: false, code: validationCode, message: 'Invalid name' }, { status: 400 });
        }

        const safeType = ['folder', 'file', 'text'].includes(type) ? type : 'file';

        let ownership = await verifyFolderOwnership(userId);
        if (!ownership.isValid) {
            await initializeUserFolder(userId);
            ownership = await verifyFolderOwnership(userId);
            if (!ownership.isValid) {
                return NextResponse.json({ success: false, code: 'ownership_failed', message: 'Ownership verification failed' }, { status: 403 });
            }
        }

        const normalizedCurrentPath = normalizeRelativeUploadPath(String(currentPath || ''));
        const pathResult = await ensureUserUploadPath(userId);
        if (!pathResult.success) {
            return NextResponse.json({ success: false, code: 'directory_error', message: `Failed to create upload directory: ${pathResult.error}` }, { status: 500 });
        }

        const userBase = path.resolve(pathResult.path);
        const targetDirResult = resolvePathWithinBase(userBase, normalizedCurrentPath);
        if (!targetDirResult.isInside) {
            return NextResponse.json({ success: false, code: 'path_traversal', message: 'Invalid path' }, { status: 400 });
        }

        const targetDir = targetDirResult.resolvedPath;

        try { await fs.access(targetDir); } catch { await fs.mkdir(targetDir, { recursive: true }); }

        let finalName = name.trim();
        if (safeType === 'text' && !finalName.includes('.')) {
            finalName += '.txt';
        }

        const targetPath = path.resolve(targetDir, finalName);
        try {
            await fs.access(targetPath);
            return NextResponse.json({ success: false, code: 'exists', message: 'Item already exists' }, { status: 409 });
        } catch { }

        if (safeType === 'folder') {
            await fs.mkdir(targetPath, { recursive: false });
        } else {
            await fs.writeFile(targetPath, safeType === 'text' ? '' : '', { flag: 'wx' });
        }

        const stat = await fs.stat(targetPath);

        try {
            global.io?.emit('folder-structure-updated', { userId, path: currentPath });
        } catch (e) { }

        return NextResponse.json({
            success: true,
            code: 'created',
            item: {
                name: finalName,
                path: path.join(targetDirResult.relativePath || '', finalName).split(path.sep).join('/'),
                size: stat.isDirectory() ? 0 : stat.size,
                isDirectory: stat.isDirectory(),
                modified: stat.mtime
            }
        });
    } catch (err) {

        return NextResponse.json({ success: false, code: 'server_error', message: 'Internal server error' }, { status: 500 });
    }
}