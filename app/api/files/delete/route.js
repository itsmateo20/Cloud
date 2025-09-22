// app/api/files/delete/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { prisma } from "@/lib/db";
import { getUserUploadPath } from "@/lib/paths";

export async function POST(req) {
    try {
        const session = await getSession();
        if (!session || !session.success) {
            return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
        }

        const { paths } = await req.json();
        if (!paths || !Array.isArray(paths) || paths.length === 0) {
            return NextResponse.json({
                success: false,
                code: "missing_parameters",
                message: "paths array is required"
            }, { status: 400 });
        }

        const { id } = session.user;

        const folderVerification = await verifyFolderOwnership(id);
        if (!folderVerification.isValid) {
            return NextResponse.json({
                success: false,
                code: "folder_auth_failed",
                message: "Folder authentication failed: " + folderVerification.error
            }, { status: 403 });
        }

        const userFolder = getUserUploadPath(id);
        const deletedItems = [];

        for (const itemPath of paths) {
            const fullPath = path.join(userFolder, itemPath);

            if (!fullPath.startsWith(userFolder)) {
                return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });
            }

            const stats = await fs.stat(fullPath);

            if (stats.isDirectory()) {
                await fs.rmdir(fullPath, { recursive: true });

                await prisma.folder.deleteMany({
                    where: {
                        ownerId: id,
                        path: itemPath
                    }
                });
            } else {
                await fs.unlink(fullPath);
                await prisma.file.deleteMany({
                    where: {
                        ownerId: id,
                        path: itemPath
                    }
                });
            }

            deletedItems.push({
                name: path.basename(itemPath),
                path: itemPath,
                type: stats.isDirectory() ? 'folder' : 'file'
            });
        }

        const affectedPaths = new Set();
        deletedItems.forEach(item => {
            const parentPath = path.dirname(item.path);
            const normalizedParentPath = parentPath === '.' ? '' : parentPath;
            affectedPaths.add(normalizedParentPath);
        });

        affectedPaths.forEach(affectedPath => {
            const itemsInThisPath = deletedItems.filter(item => {
                const parentPath = path.dirname(item.path);
                const normalizedParentPath = parentPath === '.' ? '' : parentPath;
                return normalizedParentPath === affectedPath;
            });

            global.io?.emit("file-updated", {
                path: affectedPath,
                action: "delete",
                deletedItems: itemsInThisPath
            });
        });

        return NextResponse.json({ success: true, code: "explorer_delete_success" }, { status: 200 });

    } catch (error) {

        return NextResponse.json({
            success: false,
            code: "explorer_delete_failed",
            message: error.message
        }, { status: 500 });
    }
}
