import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { getUserUploadPath, resolvePathWithinBase } from "@/lib/paths";
import { addSharedAccessMember, canAccessSharedFolder } from "@/lib/sharedAccess";
import prisma from "@/lib/db";

export async function GET(req, { params }) {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(req.url);
    const requestedPath = String(url.searchParams.get("path") || "").replace(/\\/g, "/");
    const email = session.user.email || session.user.googleEmail || session.user.githubEmail || session.user.discordEmail || "";
    const access = await canAccessSharedFolder(Number(id), session.user.id, email);
    if (!access.ok) {
        return NextResponse.json({ success: false, code: "forbidden" }, { status: 403 });
    }
    if (access.reason === "email") {
        await addSharedAccessMember(Number(id), session.user.id, email);
    }

    const share = access.share;
    const sourceResolution = resolvePathWithinBase(getUserUploadPath(share.ownerId), share.folderPath);
    if (!sourceResolution.isInside || share.folderPath === ".private" || share.folderPath.startsWith(".private/")) {
        return NextResponse.json({ success: false, code: "invalid_folder" }, { status: 403 });
    }

    const targetResolution = resolvePathWithinBase(sourceResolution.resolvedPath, requestedPath);
    if (!targetResolution.isInside) {
        return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
    }

    try {
        await fs.stat(sourceResolution.resolvedPath);
        const stat = await fs.stat(targetResolution.resolvedPath);
        if (!stat.isDirectory()) {
            return NextResponse.json({ success: false, code: "folder_not_found" }, { status: 404 });
        }

        const entries = await fs.readdir(targetResolution.resolvedPath, { withFileTypes: true });
        const items = await Promise.all(entries
            .filter((entry) => entry.isDirectory() || entry.isFile())
            .filter((entry) => entry.name !== ".thumbnails" && entry.name !== ".trash" && entry.name !== ".private")
            .map(async (entry) => {
                const absolutePath = path.join(targetResolution.resolvedPath, entry.name);
                const itemStat = await fs.stat(absolutePath);
                const sourceRelativePath = path.relative(sourceResolution.resolvedPath, absolutePath).replace(/\\/g, "/");
                const ownerRelativePath = path.join(share.folderPath, sourceRelativePath).replace(/\\/g, "/");
                return {
                    id: ownerRelativePath,
                    name: entry.name,
                    path: ownerRelativePath,
                    browsePath: sourceRelativePath,
                    type: entry.isDirectory() ? "folder" : "file",
                    size: entry.isDirectory() ? 0 : itemStat.size,
                    modified: itemStat.mtime
                };
            }));

        items.sort((a, b) => {
            if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        });

        await prisma.folder.upsert({
            where: { ownerId_path: { ownerId: share.ownerId, path: share.folderPath } },
            update: {},
            create: { ownerId: share.ownerId, name: path.basename(share.folderPath), path: share.folderPath }
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            path: requestedPath,
            sourceFolderPath: share.folderPath,
            items
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "shared_access_browse_failed", message: error.message }, { status: 500 });
    }
}
