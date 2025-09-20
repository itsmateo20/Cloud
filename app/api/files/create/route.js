import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { verifyFolderOwnership, initializeUserFolder } from '@/lib/folderAuth';
import { getSession } from '@/lib/session';
import { getUserUploadPath, ensureUserUploadPath } from '@/lib/paths';

// Helper to sanitize and validate name
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

        // Verify the base folder ownership (currentPath points inside user's space)
        let ownership = await verifyFolderOwnership(userId);
        if (!ownership.isValid) {
            // attempt repair/initialize then re-verify
            await initializeUserFolder(userId);
            ownership = await verifyFolderOwnership(userId);
            if (!ownership.isValid) {
                return NextResponse.json({ success: false, code: 'ownership_failed', message: 'Ownership verification failed' }, { status: 403 });
            }
        }

        const userBase = getUserUploadPath(userId);
        // currentPath may be '' or nested relative path; normalize
        const targetDir = path.join(userBase, currentPath);

        // Ensure targetDir is still within userBase
        if (!targetDir.startsWith(userBase)) {
            return NextResponse.json({ success: false, code: 'path_traversal', message: 'Invalid path' }, { status: 400 });
        }

        // Ensure directory exists
        try { await fs.access(targetDir); } catch { await fs.mkdir(targetDir, { recursive: true }); }

        let finalName = name.trim();
        if (safeType === 'text' && !finalName.includes('.')) {
            finalName += '.txt';
        }

        const targetPath = path.join(targetDir, finalName);
        // Prevent overwrite
        try {
            await fs.access(targetPath);
            return NextResponse.json({ success: false, code: 'exists', message: 'Item already exists' }, { status: 409 });
        } catch { /* not existing is expected */ }

        if (safeType === 'folder') {
            await fs.mkdir(targetPath, { recursive: false });
        } else {
            // Create empty file (or with placeholder for text)
            await fs.writeFile(targetPath, safeType === 'text' ? '' : '', { flag: 'wx' });
        }

        const stat = await fs.stat(targetPath);

        // Emit realtime update if socket available
        try {
            global.io?.emit('folder-structure-updated', { userId, path: currentPath });
        } catch (e) { }

        return NextResponse.json({
            success: true,
            code: 'created',
            item: {
                name: finalName,
                path: path.join(currentPath || '', finalName).replace(/\\/g, '/'),
                size: stat.isDirectory() ? 0 : stat.size,
                isDirectory: stat.isDirectory(),
                modified: stat.mtime
            }
        });
    } catch (err) {
        console.error('Create item error:', err);
        return NextResponse.json({ success: false, code: 'server_error', message: 'Internal server error' }, { status: 500 });
    }
}