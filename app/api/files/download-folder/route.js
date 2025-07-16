// app/api/files/download-folder/route.js
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import fs from "fs/promises";
import path from "path";
import archiver from "archiver";

export async function GET(req) {
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

    const url = new URL(req.url);
    const folderPath = url.searchParams.get("path");

    if (!folderPath) {
        return NextResponse.json({ success: false, code: "missing_path" }, { status: 400 });
    }

    try {
        const userFolder = path.join(process.cwd(), "uploads", String(userId));
        const targetPath = path.join(userFolder, folderPath);

        if (!targetPath.startsWith(userFolder)) {
            return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
        }

        const stat = await fs.stat(targetPath);
        if (!stat.isDirectory()) {
            return NextResponse.json({ success: false, code: "not_a_folder" }, { status: 400 });
        }

        const folderName = path.basename(targetPath) || "folder";
        const zipFileName = `${folderName}.zip`;

        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        const headers = new Headers({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFileName)}"`,
            'Cache-Control': 'no-cache'
        });

        let controller;
        const stream = new ReadableStream({
            start(_controller) {
                controller = _controller;

                archive.on('data', (chunk) => {
                    controller.enqueue(new Uint8Array(chunk));
                });

                archive.on('end', () => {
                    controller.close();
                });

                archive.on('error', (err) => {
                    controller.error(err);
                });

                addFolderToArchive(archive, targetPath, '').then(() => {

                    archive.finalize();
                }).catch(err => {
                    controller.error(err);
                });
            }
        });

        return new Response(stream, { headers });

    } catch (error) {
        console.error("Folder download error:", error);
        return NextResponse.json({
            success: false,
            code: "download_failed",
            message: error.message
        }, { status: 500 });
    }
}

async function addFolderToArchive(archive, folderPath, relativePath) {
    try {
        const items = await fs.readdir(folderPath);

        for (const item of items) {

            if (item.endsWith('.INF')) continue;

            const itemPath = path.join(folderPath, item);
            const itemRelativePath = path.join(relativePath, item);
            const stat = await fs.stat(itemPath);

            if (stat.isDirectory()) {

                await addFolderToArchive(archive, itemPath, itemRelativePath);
            } else {

                archive.file(itemPath, { name: itemRelativePath });
            }
        }
    } catch (error) {
        console.error("Error adding folder to archive:", error);
        throw error;
    }
}
