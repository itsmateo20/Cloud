// api/files/rename/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";

export async function POST(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });

    const { id } = session.user;
    const { oldPath, newName } = await req.json();

    const userFolder = path.join(process.cwd(), "uploads", String(id));
    const oldFullPath = path.join(userFolder, oldPath);
    const newFullPath = path.join(path.dirname(oldFullPath), newName);

    if (!oldFullPath.startsWith(userFolder) || !newFullPath.startsWith(userFolder)) return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });

    try {
        await fs.rename(oldFullPath, newFullPath);

        global.io?.emit("file-updated", {
            path: path.dirname(oldPath).replace(".", ""),
            action: "rename",
            oldName: path.basename(oldPath),
            newName,
        });

        global.io?.emit("folder-structure-updated", {
            action: "rename",
            oldPath: oldPath,
            newPath: path.join(path.dirname(oldPath).replace(".", ""), newName),
            oldName: path.basename(oldPath),
            newName: newName
        });

        return NextResponse.json({ success: true, code: "explorer_rename_success" }, { status: 200 });
    } catch (error) {
        console.error("Error renaming file:", error);
        return NextResponse.json({ success: false, code: "explorer_rename_failed", error }, { status: 500 });
    }
}