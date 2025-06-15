// api/files/route.js

import fs from 'fs/promises';
import path from 'path';
import { getSession } from '@/lib/session';

export async function GET(req) {
    const session = await getSession();
    if (!session) return new Response(JSON.stringify({ success: false, code: "unauthorized" }), { status: 401 });

    const { id, email } = session.user;
    const url = new URL(req.url);
    const requestedPath = url.searchParams.get('path') || '';

    // Security: Ensure path doesn't escape user folder
    const userFolder = path.join(process.cwd(), 'uploads', String(id));
    const targetPath = path.join(userFolder, requestedPath);

    // Ensure target path is within user folder
    if (!targetPath.startsWith(userFolder)) {
        return new Response(JSON.stringify({ success: false, code: "invalid_path" }), { status: 400 });
    }

    const infoPath = path.join(userFolder, 'USRINF.INF');
    const infoData = { id, email };

    try {
        await fs.mkdir(userFolder, { recursive: true });

        // Handle user info file
        const fileExists = await fs.stat(infoPath).then(() => true).catch(() => false);
        if (fileExists) {
            const raw = await fs.readFile(infoPath, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed.id !== id || parsed.email !== email)
                return new Response(JSON.stringify({ success: false, code: "unauthorized_folder_access" }), { status: 401 });
        } else {
            await fs.writeFile(infoPath, JSON.stringify(infoData, null, 2), 'utf8');
        }

        // Check if target path exists
        const pathExists = await fs.stat(targetPath).then(() => true).catch(() => false);
        if (!pathExists) {
            return Response.json({ folders: [], files: [] });
        }

        const items = await fs.readdir(targetPath);
        const folders = [];
        const files = [];

        await Promise.all(
            items
                .filter(item => !item.endsWith('.INF'))
                .map(async item => {
                    const itemPath = path.join(targetPath, item);
                    const stat = await fs.stat(itemPath);
                    const relativePath = path.relative(userFolder, itemPath).replace(/\\/g, '/');

                    if (stat.isDirectory()) {
                        // Check if folder has contents
                        const contents = await fs.readdir(itemPath).catch(() => []);
                        const hasSubfolders = await Promise.all(
                            contents.map(async subItem => {
                                const subItemPath = path.join(itemPath, subItem);
                                const subStat = await fs.stat(subItemPath).catch(() => null);
                                return subStat?.isDirectory() || false;
                            })
                        ).then(results => results.some(Boolean));

                        folders.push({
                            name: item,
                            path: relativePath,
                            type: 'folder',
                            hasSubfolders,
                            modified: stat.mtime,
                        });
                    } else {
                        files.push({
                            name: item,
                            path: relativePath,
                            type: 'file',
                            size: stat.size,
                            modified: stat.mtime,
                            url: `/uploads/${String(id)}/${relativePath}`
                        });
                    }
                })
        );

        // Sort folders and files alphabetically
        folders.sort((a, b) => a.name.localeCompare(b.name));
        files.sort((a, b) => a.name.localeCompare(b.name));

        return Response.json({ folders, files });
    } catch (err) {
        console.error("Error reading directory:", err);
        return new Response("Failed to read directory", { status: 500 });
    }
}