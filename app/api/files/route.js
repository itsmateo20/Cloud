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

        await Promise.all(
            items.filter(item => !item.endsWith(".INF") && item !== '.thumbnails').map(async item => {
                const itemPath = path.join(targetPath, item);
                const stat = await fs.stat(itemPath);
                const relativePath = path.relative(userFolder, itemPath).replace(/\\/g, "/");
                const parentFolderPath = requestedPath || null;

                if (stat.isDirectory()) {
                    const contents = await fs.readdir(itemPath).catch(() => []);
                    const hasSubfolders = await Promise.all(
                        contents.map(async subItem => {
                            const subItemPath = path.join(itemPath, subItem);
                            const subStat = await fs.stat(subItemPath).catch(() => null);
                            return subStat?.isDirectory() || false;
                        })
                    ).then(results => results.some(Boolean));

                    let parentFolder = null;
                    if (parentFolderPath) {
                        parentFolder = await prisma.folder.findFirst({
                            where: {
                                ownerId: userId,
                                path: parentFolderPath
                            }
                        });
                    }

                    const folder = await prisma.folder.upsert({
                        where: { ownerId_path: { ownerId: userId, path: relativePath } },
                        update: {
                            createdAt: stat.birthtime,
                            parentId: parentFolder?.id ?? null
                        },
                        create: {
                            name: item,
                            path: relativePath,
                            ownerId: userId,
                            createdAt: stat.birthtime,
                            parentId: parentFolder?.id ?? null
                        },
                        include: {
                            favoritedBy: {
                                where: { id: userId },
                                select: { id: true }
                            }
                        }
                    });

                    folders.push({
                        id: folder.id,
                        name: item,
                        path: relativePath,
                        type: "folder",
                        hasSubfolders,
                        modified: stat.mtime,
                        isFavorited: folder.favoritedBy.length > 0
                    });
                } else {
                    let folder = null;
                    if (parentFolderPath) {
                        const folderName = parentFolderPath.split("/").pop();
                        folder = await prisma.folder.findFirst({
                            where: { ownerId: userId, name: folderName }
                        });
                    }

                    const file = await prisma.file.upsert({
                        where: { ownerId_path: { ownerId: userId, path: relativePath } },
                        update: {
                            size: BigInt(stat.size),
                        },
                        create: {
                            name: item,
                            path: relativePath,
                            ownerId: userId,
                            size: BigInt(stat.size),
                            type: path.extname(item).slice(1) || "unknown",
                            createdAt: stat.birthtime,
                            folderId: folder?.id || null,
                        },
                        include: {
                            favoritedBy: {
                                where: { id: userId },
                                select: { id: true }
                            }
                        }
                    });

                    files.push({
                        id: file.id,
                        name: item,
                        path: relativePath,
                        type: "file",
                        size: Number(stat.size),
                        modified: stat.mtime,
                        url: getUserFileUrl(userId, relativePath),
                        isFavorited: file.favoritedBy.length > 0
                    });
                }
            })
        );

        folders.sort((a, b) => a.name.localeCompare(b.name));
        files.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({
            folders,
            files: files.map(file => ({
                ...file,
                size: file.size ? file.size.toString() : null
            })),
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
                return NextResponse.json({ success: false, code: "folder_exists", message: "Folder already exists" }, { status: 400 });
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
            global.io?.emit("folder-structure-updated", {
                action: "create",
                newPath: relativePath,
                name: name
            });

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
            global.io?.emit("file-updated", {
                path: targetPath || "",
                action: "create",
                file: {
                    id: file.id,
                    name: file.name,
                    path: file.path,
                    type: "file"
                }
            });

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
