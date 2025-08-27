// app/api/files/upload/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { verifyFolderOwnership } from "@/lib/folderAuth";

export async function POST(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });

    const { id } = session.user;
    const folderVerification = await verifyFolderOwnership(id);
    if (!folderVerification.isValid) return NextResponse.json({
        success: false,
        code: "folder_auth_failed",
        message: "Folder authentication failed: " + folderVerification.error
    }, { status: 403 });

    try {
        const formData = await req.formData();
        const targetPath = formData.get("path") || "";
        const files = formData.getAll("files");

        if (!files || files.length === 0) return NextResponse.json({ success: false, code: "no_files" }, { status: 400 });

        const userFolder = path.join(process.cwd(), "uploads", String(id));
        const targetFolder = path.join(userFolder, targetPath);
        await fs.mkdir(targetFolder, { recursive: true });

        const uploadedFiles = [];

        for (const file of files) {
            if (!file || typeof file === 'string') continue;

            const fileName = file.name;
            const filePath = path.join(targetFolder, fileName);
            if (!filePath.startsWith(userFolder)) return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });
            let finalPath = filePath;
            let counter = 1;
            while (true) {
                try {
                    await fs.access(finalPath);
                    const ext = path.extname(fileName);
                    const baseName = path.basename(fileName, ext);
                    finalPath = path.join(targetFolder, `${baseName} (${counter})${ext}`);
                    counter++;
                } catch {
                    break;
                }
            }
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await fs.writeFile(finalPath, buffer);

            uploadedFiles.push({
                name: path.basename(finalPath),
                path: path.relative(userFolder, finalPath).replace(/\\/g, '/'),
                size: buffer.length
            });
        }
        global.io?.emit("file-updated", {
            path: targetPath,
            action: "upload",
            files: uploadedFiles
        });

        return NextResponse.json({
            success: true,
            files: uploadedFiles,
            message: `Successfully uploaded ${uploadedFiles.length} file(s)`
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            code: "upload_failed",
            message: error.message
        }, { status: 500 });
    }
}
