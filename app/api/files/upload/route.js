// app/api/files/upload/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { preserveFileMetadata } from "@/utils/fileMetadata.server";
import { getUserUploadPath, ensureUserUploadPath } from "@/lib/paths";

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
        const metadataString = formData.get("metadata");

        if (!files || files.length === 0) return NextResponse.json({ success: false, code: "no_files" }, { status: 400 });

        let metadata = [];
        if (metadataString) {
            try {
                metadata = JSON.parse(metadataString);
            } catch (error) {

            }
        }

        const pathResult = await ensureUserUploadPath(id);
        if (!pathResult.success) {
            return NextResponse.json({
                success: false,
                code: "directory_error",
                message: `Failed to create upload directory: ${pathResult.error}`
            }, { status: 500 });
        }

        const userFolder = pathResult.path;
        const targetFolder = path.join(userFolder, targetPath);

        // Ensure target directory exists and is accessible
        try {
            await fs.mkdir(targetFolder, { recursive: true });
            // Verify the directory was created and is accessible
            await fs.access(targetFolder, fs.constants.R_OK | fs.constants.W_OK);
        } catch (error) {
            return NextResponse.json({
                success: false,
                code: "directory_error",
                message: `Failed to create or access target directory: ${error.message}`
            }, { status: 500 });
        }

        const uploadedFiles = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
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

            const fileMetadata = metadata[i];
            if (fileMetadata) {
                try {
                    const metadataResult = await preserveFileMetadata(finalPath, fileMetadata);

                } catch (error) {

                }
            }

            uploadedFiles.push({
                name: path.basename(finalPath),
                path: path.relative(userFolder, finalPath).replace(/\\/g, '/'),
                size: buffer.length,
                metadataPreserved: !!fileMetadata
            });
        }
        try {
            const room = `user:${id}`;
            global.io?.to(room).emit("file-updated", {
                userId: id,
                path: targetPath,
                action: "upload",
                files: uploadedFiles
            });
        } catch { }

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
