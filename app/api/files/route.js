// api/files/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";

export async function GET(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });

    const { id, email } = session.user;
    const url = new URL(req.url);
    const requestedPath = url.searchParams.get("path") || "";

    const userFolder = path.join(process.cwd(), "uploads", String(id));
    const targetPath = path.join(userFolder, requestedPath);

    if (!targetPath.startsWith(userFolder)) {
        return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });
    }

    const infoPath = path.join(userFolder, "USRINF.INF");
    const infoData = { id, email };

    try {
        await fs.mkdir(userFolder, { recursive: true });

        const fileExists = await fs.stat(infoPath).then(() => true).catch(() => false);
        if (fileExists) {
            const raw = await fs.readFile(infoPath, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed.id !== id || parsed.email !== email)
                return NextResponse.json({ success: false, code: "explorer_unauthorized_folder_access" }, { status: 401 });
        } else {
            await fs.writeFile(infoPath, JSON.stringify(infoData, null, 2), "utf8");
        }

        const pathExists = await fs.stat(targetPath).then(() => true).catch(() => false);
        if (!pathExists) {
            return NextResponse.json({ folders: [], files: [] });
        }

        const items = await fs.readdir(targetPath);
        const folders = [];
        const files = [];

        await Promise.all(
            items
                .filter(item => !item.endsWith(".INF"))
                .map(async item => {
                    const itemPath = path.join(targetPath, item);
                    const stat = await fs.stat(itemPath);
                    const relativePath = path.relative(userFolder, itemPath).replace(/\\/g, "/");

                    if (stat.isDirectory()) {
                        const contents = await fs.readdir(itemPath).catch(() => []);
                        const hasSubfolders = await Promise.all(
                            contents.map(async subItem => {
                                const subItemPath = path.join(itemPath, subItem);
                                const subStat = await fs.stat(subItemPath).catch(() => null);
                                return subStat?.isDirectory() || false;
                            })
                        ).then(results => results.some(Boolean));

                        folders.push({
                            name: item,
                            path: relativePath,
                            type: "folder",
                            hasSubfolders,
                            modified: stat.mtime,
                        });
                    } else {
                        files.push({
                            name: item,
                            path: relativePath,
                            type: "file",
                            size: stat.size,
                            modified: stat.mtime,
                            url: `/uploads/${String(id)}/${relativePath}`
                        });
                    }
                })
        );

        folders.sort((a, b) => a.name.localeCompare(b.name));
        files.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ folders, files, success: true, code: "explorer_directory_read" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "explorer_directory_unreadable", error }, { status: 500 });
    }
}