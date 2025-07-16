// app/api/files/rename/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { prisma } from "@/lib/db";

export async function POST(req) {
    try {
        const session = await getSession();
        if (!session || !session.success) {
            return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
        }

        const { oldPath, newName } = await req.json();
        if (!oldPath || !newName) {
            return NextResponse.json({
                success: false,
                code: "missing_parameters",
                message: "oldPath and newName are required"
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

        const userFolder = path.join(process.cwd(), "uploads", String(id));
        const oldFullPath = path.join(userFolder, oldPath);
        const newFullPath = path.join(path.dirname(oldFullPath), newName);

        if (!oldFullPath.startsWith(userFolder) || !newFullPath.startsWith(userFolder)) {
            return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });
        }

        await fs.rename(oldFullPath, newFullPath);
        const newPath = path.join(path.dirname(oldPath), newName).replace(/\\/g, '/');
        await prisma.file.updateMany({
            where: {
                ownerId: id,
                path: oldPath
            },
            data: {
                path: newPath,
                name: newName
            }
        });

        global.io?.emit("file-updated", {
            path: path.dirname(oldPath).replace(".", ""),
            action: "rename",
            oldName: path.basename(oldPath),
            newName,
        });

        global.io?.emit("folder-structure-updated", {
            action: "rename",
            oldPath: oldPath,
            newPath: newPath,
            oldName: path.basename(oldPath),
            newName: newName
        });

        return NextResponse.json({ success: true, code: "explorer_rename_success" }, { status: 200 });

    } catch (error) {
        console.error('Error in rename operation:', error);
        return NextResponse.json({
            success: false,
            code: "explorer_rename_failed",
            message: error.message
        }, { status: 500 });
    }
}