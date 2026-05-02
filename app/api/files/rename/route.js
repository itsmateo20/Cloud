// app/api/files/rename/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sanitizeFilename from "sanitize-filename";
import { getSession } from "@/lib/session";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import prisma from "@/lib/db";
import { resolveUserUploadPath } from "@/lib/paths";

export async function POST(req) {
    try {
        const session = await getSession();
        if (!session || !session.success) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });

        const { oldPath, newName } = await req.json();
        if (!oldPath || !newName) return NextResponse.json({ success: false, code: "missing_parameters", message: "oldPath and newName are required" }, { status: 400 });
        const safeNewName = sanitizeFilename(String(newName || '').trim());
        if (!safeNewName || safeNewName.length > 255) return NextResponse.json({ success: false, code: "invalid_name", message: "Invalid name" }, { status: 400 });
        const { id } = session.user;
        const folderVerification = await verifyFolderOwnership(id);
        if (!folderVerification.isValid) return NextResponse.json({ success: false, code: "folder_auth_failed", message: "Folder authentication failed: " + folderVerification.error }, { status: 403 });

        const oldResolved = resolveUserUploadPath(id, oldPath);
        if (!oldResolved.isInside) return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });

        const userFolder = oldResolved.basePath;
        const oldFullPath = oldResolved.resolvedPath;
        const newFullPath = path.resolve(path.dirname(oldFullPath), safeNewName);
        const relativeNewPath = path.relative(userFolder, newFullPath).replace(/\\/g, '/');
        const newResolved = resolveUserUploadPath(id, relativeNewPath);

        if (!newResolved.isInside) return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });

        const canonicalNewFullPath = path.resolve(userFolder, newResolved.relativePath);
        if (canonicalNewFullPath !== userFolder && !canonicalNewFullPath.startsWith(userFolder + path.sep)) {
            return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });
        }

        await fs.rename(oldFullPath, canonicalNewFullPath);
        const newPath = newResolved.relativePath;
        await prisma.file.updateMany({
            where: {
                ownerId: id,
                path: oldResolved.relativePath
            },
            data: {
                path: newPath,
                name: safeNewName
            }
        });

        try {
            const room = `user:${id}`;
            const payloadFU = {
                userId: id,
                path: path.dirname(oldResolved.relativePath).replace(".", ""),
                action: "rename",
                oldName: path.basename(oldResolved.relativePath),
                newName: safeNewName,
            };
            global.io?.to(room).emit("file-updated", payloadFU);
        } catch { }

        try {
            const room = `user:${id}`;
            const payloadFS = {
                userId: id,
                action: "rename",
                oldPath: oldResolved.relativePath,
                newPath: newPath,
                oldName: path.basename(oldResolved.relativePath),
                newName: safeNewName
            };
            global.io?.to(room).emit("folder-structure-updated", payloadFS);
        } catch { }

        return NextResponse.json({ success: true, code: "explorer_rename_success" }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ success: false, code: "explorer_rename_failed", message: error.message }, { status: 500 });
    }
}