// api/files/delete/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";

export async function POST(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });

    const { id } = session.user;
    const { paths } = await req.json();

    const userFolder = path.join(process.cwd(), "uploads", String(id));

    try {
        const deletedItems = [];

        for (const itemPath of paths) {
            const fullPath = path.join(userFolder, itemPath);

            if (!fullPath.startsWith(userFolder)) return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });

            const stats = await fs.stat(fullPath);

            if (stats.isDirectory()) await fs.rmdir(fullPath, { recursive: true });
            else await fs.unlink(fullPath);

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
        return NextResponse.json({ success: false, code: "explorer_delete_failed", error }, { status: 500 });
    }
}