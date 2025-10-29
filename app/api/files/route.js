// app/api/files/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { getUserUploadPath, getUserFileUrl } from "@/lib/paths";

export async function GET(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });

    const { id: userId, email } = session.user;
    const folderVerification = await verifyFolderOwnership(userId);
    if (!folderVerification.isValid) return NextResponse.json({ success: false, code: "folder_auth_failed", message: "Folder authentication failed: " + folderVerification.error }, { status: 403 });

    const url = new URL(req.url);
    const requestedPath = url.searchParams.get("path") || "";

    const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : null;
    const cursor = url.searchParams.get("cursor") || null;

    const userFolder = getUserUploadPath(userId);
    const targetPath = path.join(userFolder, requestedPath);

    if (!targetPath.startsWith(userFolder)) return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });

    const infoPath = path.join(userFolder, "USRINF.INF");
    const infoData = { id: userId, email };

    try {
        await fs.mkdir(userFolder, { recursive: true });

        const fileExists = await fs.stat(infoPath).then(() => true).catch(() => false);
        if (fileExists) {
            const raw = await fs.readFile(infoPath, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed.id !== userId || parsed.email !== email) return NextResponse.json({ success: false, code: "explorer_unauthorized_folder_access" }, { status: 401 });
        } else await fs.writeFile(infoPath, JSON.stringify(infoData, null, 2), "utf8");

        const pathExists = await fs.stat(targetPath).then(() => true).catch(() => false);
        if (!pathExists) return NextResponse.json({ folders: [], files: [] }, { status: 200 });

        const items = (await fs.readdir(targetPath))
            .filter(name => name !== '.thumbnails');
        const folders = [];
        const files = [];

        const itemStats = await Promise.all(
            items.filter(item => !item.endsWith(".INF") && item !== '.thumbnails').map(async item => {
                const itemPath = path.join(targetPath, item);
                const stat = await fs.stat(itemPath);
                const relativePath = path.relative(userFolder, itemPath).replace(/\\/g, "/");

                return {
                    name: item,
                    path: relativePath,
                    fullPath: itemPath,
                    stat,
                    isDirectory: stat.isDirectory()
                };
            })
        );

        const allPaths = itemStats.map(item => item.path);
        const [existingFolders, existingFiles] = await Promise.all([
            prisma.folder.findMany({
                where: { ownerId: userId, path: { in: allPaths.filter((_, i) => itemStats[i].isDirectory) } },
                include: { favoritedBy: { where: { id: userId }, select: { id: true } } }
            }),
            prisma.file.findMany({
                where: { ownerId: userId, path: { in: allPaths.filter((_, i) => !itemStats[i].isDirectory) } },
                include: { favoritedBy: { where: { id: userId }, select: { id: true } } }
            })
        ]);

        const folderMap = new Map(existingFolders.map(f => [f.path, f]));
        const fileMap = new Map(existingFiles.map(f => [f.path, f]));

        const folderData = [];
        const newFolders = [];
        const updateFolders = [];

        for (const item of itemStats.filter(i => i.isDirectory)) {
            const existing = folderMap.get(item.path);
            const contents = await fs.readdir(item.fullPath).catch(() => []);
            const hasSubfolders = await Promise.all(
                contents.map(async subItem => {
                    const subItemPath = path.join(item.fullPath, subItem);
                    const subStat = await fs.stat(subItemPath).catch(() => null);
                    return subStat?.isDirectory() || false;
                })
            ).then(results => results.some(Boolean));

            if (existing) {
                updateFolders.push({
                    where: { id: existing.id },
                    data: { createdAt: item.stat.birthtime }
                });
                folderData.push({
                    id: existing.id,
                    name: item.name,
                    path: item.path,
                    type: "folder",
                    hasSubfolders,
                    modified: item.stat.mtime,
                    isFavorited: existing.favoritedBy.length > 0
                });
            } else {
                const newFolder = {
                    name: item.name,
                    path: item.path,
                    ownerId: userId,
                    createdAt: item.stat.birthtime,
                    parentId: null
                };
                newFolders.push(newFolder);
                folderData.push({
                    id: null,
                    name: item.name,
                    path: item.path,
                    type: "folder",
                    hasSubfolders,
                    modified: item.stat.mtime,
                    isFavorited: false
                });
            }
        }

        const fileData = [];
        const newFiles = [];
        const updateFiles = [];

        for (const item of itemStats.filter(i => !i.isDirectory)) {
            const existing = fileMap.get(item.path);

            if (existing) {
                updateFiles.push({
                    where: { id: existing.id },
                    data: { size: BigInt(item.stat.size) }
                });
                fileData.push({
                    id: existing.id,
                    name: item.name,
                    path: item.path,
                    type: "file",
                    size: Number(item.stat.size),
                    modified: item.stat.mtime,
                    url: getUserFileUrl(userId, item.path),
                    isFavorited: existing.favoritedBy.length > 0
                });
            } else {
                const newFile = {
                    name: item.name,
                    path: item.path,
                    ownerId: userId,
                    size: BigInt(item.stat.size),
                    type: path.extname(item.name).slice(1) || "unknown",
                    createdAt: item.stat.birthtime,
                    folderId: null
                };
                newFiles.push(newFile);
                fileData.push({
                    id: null,
                    name: item.name,
                    path: item.path,
                    type: "file",
                    size: Number(item.stat.size),
                    modified: item.stat.mtime,
                    url: getUserFileUrl(userId, item.path),
                    isFavorited: false
                });
            }
        }

        await Promise.all([
            newFolders.length > 0 ? prisma.folder.createMany({ data: newFolders }) : Promise.resolve(),
            newFiles.length > 0 ? prisma.file.createMany({ data: newFiles }) : Promise.resolve(),
            ...updateFolders.map(update => prisma.folder.update(update)),
            ...updateFiles.map(update => prisma.file.update(update))
        ]);

        folders.push(...folderData);
        files.push(...fileData);

        folders.sort((a, b) => a.name.localeCompare(b.name));
        files.sort((a, b) => a.name.localeCompare(b.name));

        let pagedFolders = folders;
        let pagedFiles = files;
        let nextCursor = null;
        let hasMore = false;

        if (limit) {

            const combined = [
                ...folders.map(f => ({ kind: 'folder', name: f.name })),
                ...files.map(f => ({ kind: 'file', name: f.name }))
            ];

            let startIndex = 0;
            if (cursor) {

                const cursorMatch = cursor.match(/^(F|FI):(.+)$/);
                if (cursorMatch) {
                    const [, typeToken, curName] = cursorMatch;
                    const isFolderCursor = typeToken === 'F';
                    const idx = combined.findIndex(e => e.kind === (isFolderCursor ? 'folder' : 'file') && e.name === curName);
                    if (idx !== -1) startIndex = idx + 1;
                }
            }

            const endIndexExclusive = startIndex + limit;
            const pageSlice = combined.slice(startIndex, endIndexExclusive);
            hasMore = endIndexExclusive < combined.length;
            const lastItem = pageSlice[pageSlice.length - 1];
            if (hasMore && lastItem) {
                nextCursor = (lastItem.kind === 'folder' ? 'F:' : 'FI:') + lastItem.name;
            }

            const folderNamesInPage = new Set(pageSlice.filter(i => i.kind === 'folder').map(i => i.name));
            const fileNamesInPage = new Set(pageSlice.filter(i => i.kind === 'file').map(i => i.name));
            pagedFolders = folders.filter(f => folderNamesInPage.has(f.name));
            pagedFiles = files.filter(f => fileNamesInPage.has(f.name));
        }

        return NextResponse.json({
            folders: pagedFolders,
            files: pagedFiles.map(file => ({
                ...file,
                size: file.size ? file.size.toString() : null
            })),
            pagination: limit ? {
                limit,
                cursor: cursor || null,
                nextCursor,
                hasMore
            } : null,
            success: true,
            code: "explorer_directory_read",
            path: {
                current: requestedPath,
                segments: requestedPath.split('/').filter(Boolean).map((segment, index, array) => {
                    const path = array.slice(0, index + 1).join('/');
                    return { name: segment, path };
                })
            }
        }, { status: 200 });

    } catch (error) {
        return NextResponse.json({
            success: false,
            code: "explorer_directory_unreadable",
            error: error.message
        }, { status: 500 });
    }
}

export async function POST(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    const { id: userId } = session.user;
    const folderVerification = await verifyFolderOwnership(userId);
    if (!folderVerification.isValid) {
        return NextResponse.json({
            success: false,
            code: "folder_auth_failed",
            message: "Folder authentication failed: " + folderVerification.error
        }, { status: 403 });
    }

    try {
        const { action, path: targetPath, name } = await req.json();

        if (action === 'create_folder') {
            const userFolder = getUserUploadPath(userId);
            const folderPath = path.join(userFolder, targetPath || "", name);
            if (!folderPath.startsWith(userFolder)) {
                return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });
            }
            try {
                await fs.access(folderPath);
                return NextResponse.json({ success: true, code: "directory_exists", message: "Folder already exists" }, { status: 200 });
            } catch {

            }
            await fs.mkdir(folderPath, { recursive: true });
            const relativePath = path.relative(userFolder, folderPath).replace(/\\/g, '/');
            let parentFolder = null;
            if (targetPath) {
                const parentPath = targetPath;
                parentFolder = await prisma.folder.findFirst({
                    where: { ownerId: userId, path: parentPath }
                });
            }

            const folder = await prisma.folder.create({
                data: {
                    name: name,
                    path: relativePath,
                    ownerId: userId,
                    parentId: parentFolder?.id || null
                }
            });
            try {
                const room = `user:${userId}`;
                const payload = { userId, action: "create", newPath: relativePath, name };
                global.io?.to(room).emit("folder-structure-updated", payload);
            } catch { }

            return NextResponse.json({
                success: true,
                folder: {
                    id: folder.id,
                    name: folder.name,
                    path: folder.path,
                    type: "folder"
                },
                message: "Folder created successfully"
            }, { status: 200 });
        }

        if (action === 'create_file') {
            const { content = '' } = await req.json();
            const userFolder = getUserUploadPath(userId);
            const filePath = path.join(userFolder, targetPath || "", name);
            if (!filePath.startsWith(userFolder)) {
                return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });
            }
            try {
                await fs.access(filePath);
                return NextResponse.json({ success: false, code: "file_exists", message: "File already exists" }, { status: 400 });
            } catch {
            }
            await fs.writeFile(filePath, content);
            const relativePath = path.relative(userFolder, filePath).replace(/\\/g, '/');
            const stats = await fs.stat(filePath);
            let folder = null;
            if (targetPath) {
                folder = await prisma.folder.findFirst({
                    where: { ownerId: userId, path: targetPath }
                });
            }

            const file = await prisma.file.create({
                data: {
                    name: name,
                    path: relativePath,
                    ownerId: userId,
                    size: stats.size,
                    type: path.extname(name).slice(1) || "unknown",
                    folderId: folder?.id || null
                }
            });
            try {
                const room = `user:${userId}`;
                const payload = {
                    userId,
                    path: targetPath || "",
                    action: "create",
                    file: { id: file.id, name: file.name, path: file.path, type: "file" }
                };
                global.io?.to(room).emit("file-updated", payload);
            } catch { }

            return NextResponse.json({
                success: true,
                file: {
                    id: file.id,
                    name: file.name,
                    path: file.path,
                    type: "file",
                    size: file.size
                },
                message: "File created successfully"
            }, { status: 200 });
        }

        return NextResponse.json({ success: false, code: "invalid_action" }, { status: 400 });

    } catch (error) {

        return NextResponse.json({
            success: false,
            code: "folder_creation_failed",
            message: error.message
        }, { status: 500 });
    }
}
