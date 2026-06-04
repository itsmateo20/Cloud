// app/api/user/export-data/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/db';
import { resolveUserUploadPath } from '@/lib/paths';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { Readable } from 'stream';

export async function POST(req) {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = session.user.id;
        const { exportType } = await req.json(); // 'files', 'database', or 'both'

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

        // Create a readable stream for the ZIP file
        const archive = archiver('zip', { zlib: { level: 9 } });
        const readableStream = Readable.from(archive);

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
                                    const fileStats = await fs.stat(entryPath);
                                    const fileStream = await fs.readFile(entryPath);
                                    archive.append(fileStream, {
                                        name: archivePath.replace(/\\/g, '/'),
                                        date: fileStats.mtime
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

        // Finalize the archive
        archive.finalize();

        // Handle archive errors
        archive.on('error', (err) => {
            console.error('Archive error:', err);
        });

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `cloud-export-${timestamp}.zip`;

        return new NextResponse(readableStream, {
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
