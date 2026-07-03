// app/api/user/export-data/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/db';
import { resolveUserUploadPath } from '@/lib/paths';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { ZipArchive } from 'archiver';
import { normalizeEmailAddress } from '@/lib/email';
import { verifyAccountDeletionSignature } from '@/lib/accountDeletion';

export const runtime = 'nodejs';

export async function POST(req) {
    try {
        const session = await getSession();
        const body = await req.json().catch(() => ({}));
        const exportType = body?.exportType;
        const bodyEmail = normalizeEmailAddress(body?.email);
        const bodySignature = typeof body?.signature === 'string' ? body.signature : '';

        let userId = session?.user?.id || null;

        if (!userId) {
            if (!bodyEmail || !bodySignature || !verifyAccountDeletionSignature(bodyEmail, bodySignature)) {
                return NextResponse.json(
                    { success: false, message: 'Unauthorized' },
                    { status: 401 }
                );
            }

            const signedUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: bodyEmail },
                        { googleEmail: bodyEmail }
                    ]
                }
            });

            if (!signedUser || !signedUser.isDeleted || !signedUser.deletionScheduledAt) {
                return NextResponse.json(
                    { success: false, message: 'Account is not scheduled for deletion' },
                    { status: 400 }
                );
            }

            userId = signedUser.id;
        }

        if (!['files', 'database', 'both'].includes(exportType)) {
            return NextResponse.json(
                { success: false, message: 'Invalid export type' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                settings: true,
                files: true,
                folders: true,
                clientTokens: true
            }
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        const archive = new ZipArchive({ zlib: { level: 9 } });

        archive.on('warning', (warning) => {
            if (warning.code === 'ENOENT') {
                console.warn('Archive warning:', warning);
                return;
            }

            throw warning;
        });

        archive.on('error', (error) => {
            throw error;
        });

        // Add database entries as JSON
        if (['database', 'both'].includes(exportType)) {
            // User info (without password)
            const userExport = {
                id: user.id,
                email: user.email,
                googleEmail: user.googleEmail,
                provider: user.provider,
                admin: user.admin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };
            archive.append(JSON.stringify(userExport, null, 2), { name: 'user.json' });

            // User settings
            if (user.settings) {
                archive.append(JSON.stringify(user.settings, null, 2), { name: 'usersettings.json' });
            }

            // Files metadata
            if (user.files.length > 0) {
                const filesExport = user.files.map(f => ({
                    id: f.id,
                    name: f.name,
                    path: f.path,
                    size: f.size?.toString(),
                    type: f.type,
                    createdAt: f.createdAt,
                    updatedAt: f.updatedAt
                }));
                archive.append(JSON.stringify(filesExport, null, 2), { name: 'files_metadata.json' });
            }

            // Folders metadata
            if (user.folders.length > 0) {
                const foldersExport = user.folders.map(f => ({
                    id: f.id,
                    name: f.name,
                    path: f.path,
                    createdAt: f.createdAt,
                    updatedAt: f.updatedAt
                }));
                archive.append(JSON.stringify(foldersExport, null, 2), { name: 'folders_metadata.json' });
            }
        }

        // Add user files
        if (['files', 'both'].includes(exportType)) {
            try {
                const userPath = resolveUserUploadPath(userId).resolvedPath;

                // Check if user folder exists
                try {
                    await fs.access(userPath);
                    // Recursively add all files
                    const addFilesRecursive = async (srcPath, arcPath) => {
                        const entries = await fs.readdir(srcPath, { withFileTypes: true });

                        for (const entry of entries) {
                            const entryPath = path.join(srcPath, entry.name);
                            const archivePath = path.join(arcPath, entry.name);

                            // Skip thumbnail cache
                            if (entry.name === '.thumbnails') continue;

                            if (entry.isDirectory()) {
                                await addFilesRecursive(entryPath, archivePath);
                            } else {
                                try {
                                    archive.file(entryPath, {
                                        name: archivePath.replace(/\\/g, '/')
                                    });
                                } catch (err) {
                                    console.error(`Failed to add file ${entryPath}:`, err);
                                }
                            }
                        }
                    };

                    await addFilesRecursive(userPath, 'files');
                } catch (err) {
                    console.warn(`User upload directory not found: ${userPath}`);
                }
            } catch (err) {
                console.error('Error reading user files:', err);
            }
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `cloud-export-${timestamp}.zip`;
        const responseBody = Readable.toWeb(archive);
        archive.finalize();

        return new NextResponse(responseBody, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-cache'
            }
        });
    } catch (error) {
        console.error('Export data error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to export data' },
            { status: 500 }
        );
    }
}
