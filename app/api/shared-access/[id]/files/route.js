import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import sanitizeFilename from "sanitize-filename";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { getSession } from "@/lib/session";
import prisma from "@/lib/db";
import { getUserUploadPath, resolvePathWithinBase } from "@/lib/paths";
import { canAccessSharedFolder } from "@/lib/sharedAccess";

async function getAuthorizedContext(req, params) {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) return { session: null, response: NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 }) };

    const { id } = await params;
    const email = session.user.email || session.user.googleEmail || session.user.githubEmail || session.user.discordEmail || "";
    const access = await canAccessSharedFolder(Number(id), session.user.id, email);
    if (!access.ok) return { session, response: NextResponse.json({ success: false, code: "forbidden" }, { status: 403 }) };

    const share = access.share;
    const source = resolvePathWithinBase(getUserUploadPath(share.ownerId), share.folderPath);
    if (!source.isInside || share.folderPath === ".private" || share.folderPath.startsWith(".private/")) {
        return { session, response: NextResponse.json({ success: false, code: "invalid_folder" }, { status: 403 }) };
    }
    return { session, share, source };
}

export async function POST(req, context) {
    const auth = await getAuthorizedContext(req, context.params);
    if (auth.response) return auth.response;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const browsePath = String(formData.get("path") || "").replace(/\\/g, "/");
        const target = resolvePathWithinBase(auth.source.resolvedPath, browsePath);
        if (!target.isInside) return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });

        await fs.mkdir(target.resolvedPath, { recursive: true });
        const files = formData.getAll("files");
        const uploaded = [];

        for (const file of files) {
            if (!file || typeof file === "string") continue;
            const originalName = path.basename(String(file.name || "upload").replace(/\\/g, "/"));
            const extension = path.extname(originalName);
            const baseName = path.basename(originalName, extension);
            const fileName = `${sanitizeFilename(baseName) || "upload"}${sanitizeFilename(extension) || extension}`.slice(0, 255);
            let finalPath = path.join(target.resolvedPath, fileName);
            let counter = 1;
            while (true) {
                try {
                    await fs.access(finalPath);
                    const ext = path.extname(fileName);
                    const base = path.basename(fileName, ext);
                    finalPath = path.join(target.resolvedPath, `${base} (${counter})${ext}`);
                    counter++;
                } catch {
                    break;
                }
            }

            await pipeline(Readable.fromWeb(file.stream()), createWriteStream(finalPath));
            const stat = await fs.stat(finalPath);
            const sourceRelative = path.relative(auth.source.resolvedPath, finalPath).replace(/\\/g, "/");
            const ownerRelative = path.join(auth.share.folderPath, sourceRelative).replace(/\\/g, "/");

            await prisma.file.upsert({
                where: { ownerId_path: { ownerId: auth.share.ownerId, path: ownerRelative } },
                update: { name: path.basename(finalPath), size: BigInt(stat.size), updatedAt: new Date() },
                create: {
                    ownerId: auth.share.ownerId,
                    name: path.basename(finalPath),
                    path: ownerRelative,
                    size: BigInt(stat.size),
                    type: path.extname(finalPath).slice(1) || "unknown"
                }
            }).catch(() => {});

            uploaded.push({ name: path.basename(finalPath), path: ownerRelative, size: stat.size });
        }

        try {
            global.io?.to(`user:${auth.share.ownerId}`).emit("file-updated", { userId: auth.share.ownerId, action: "upload", path: browsePath });
        } catch {}

        return NextResponse.json({ success: true, files: uploaded }, { status: 200 });
    }

    const body = await req.json();
    const action = String(body.action || "");

    if (action === "create") {
        const name = sanitizeFilename(String(body.name || "").trim());
        if (!name) return NextResponse.json({ success: false, code: "invalid_name" }, { status: 400 });
        const browsePath = String(body.path || "").replace(/\\/g, "/");
        const targetDir = resolvePathWithinBase(auth.source.resolvedPath, browsePath);
        if (!targetDir.isInside) return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });

        const targetPath = path.resolve(targetDir.resolvedPath, name);
        const relativeToDir = path.relative(targetDir.resolvedPath, targetPath);
        if (relativeToDir.startsWith("..") || path.isAbsolute(relativeToDir)) {
            return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
        }
        try {
            await fs.access(targetPath);
            return NextResponse.json({ success: false, code: "exists" }, { status: 409 });
        } catch {}

        if (body.type === "folder") {
            await fs.mkdir(targetPath);
            const sourceRelative = path.relative(auth.source.resolvedPath, targetPath).replace(/\\/g, "/");
            const ownerRelative = path.join(auth.share.folderPath, sourceRelative).replace(/\\/g, "/");
            await prisma.folder.upsert({
                where: { ownerId_path: { ownerId: auth.share.ownerId, path: ownerRelative } },
                update: { name },
                create: { ownerId: auth.share.ownerId, name, path: ownerRelative }
            }).catch(() => {});
        } else {
            await fs.writeFile(targetPath, body.type === "text" ? "" : "", { flag: "wx" });
        }
        return NextResponse.json({ success: true }, { status: 200 });
    }

    if (action === "rename") {
        const oldPath = String(body.oldPath || "").replace(/\\/g, "/");
        const newName = sanitizeFilename(String(body.newName || "").trim());
        if (!oldPath || !newName) return NextResponse.json({ success: false, code: "invalid_name" }, { status: 400 });

        const oldOwnerResolution = resolvePathWithinBase(getUserUploadPath(auth.share.ownerId), oldPath);
        if (!oldOwnerResolution.isInside) return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
        const oldSourceRelative = path.relative(auth.source.resolvedPath, oldOwnerResolution.resolvedPath).replace(/\\/g, "/");
        if (oldSourceRelative === "" || oldSourceRelative.startsWith("..")) {
            return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
        }

        const newOwnerPath = path.join(path.dirname(oldOwnerResolution.resolvedPath), newName);
        await fs.rename(oldOwnerResolution.resolvedPath, newOwnerPath);

        const newOwnerRelative = path.relative(getUserUploadPath(auth.share.ownerId), newOwnerPath).replace(/\\/g, "/");
        await prisma.file.updateMany({
            where: { ownerId: auth.share.ownerId, path: oldPath },
            data: { path: newOwnerRelative, name: newName }
        }).catch(() => {});
        await prisma.folder.updateMany({
            where: { ownerId: auth.share.ownerId, path: oldPath },
            data: { path: newOwnerRelative, name: newName }
        }).catch(() => {});
        return NextResponse.json({ success: true }, { status: 200 });
    }

    if (action === "delete") {
        const pathsToDelete = Array.isArray(body.paths) ? body.paths : [];
        for (const relativeOwnerPath of pathsToDelete) {
            const resolution = resolvePathWithinBase(getUserUploadPath(auth.share.ownerId), String(relativeOwnerPath));
            if (!resolution.isInside) continue;
            const sourceRelative = path.relative(auth.source.resolvedPath, resolution.resolvedPath).replace(/\\/g, "/");
            if (sourceRelative === "" || sourceRelative.startsWith("..")) continue;

            const stat = await fs.stat(resolution.resolvedPath).catch(() => null);
            if (!stat) continue;
            if (stat.isDirectory()) {
                await fs.rm(resolution.resolvedPath, { recursive: true, force: true });
                await prisma.file.deleteMany({ where: { ownerId: auth.share.ownerId, OR: [{ path: resolution.relativePath }, { path: { startsWith: `${resolution.relativePath}/` } }] } }).catch(() => {});
                await prisma.folder.deleteMany({ where: { ownerId: auth.share.ownerId, OR: [{ path: resolution.relativePath }, { path: { startsWith: `${resolution.relativePath}/` } }] } }).catch(() => {});
            } else {
                await fs.unlink(resolution.resolvedPath);
                await prisma.file.deleteMany({ where: { ownerId: auth.share.ownerId, path: resolution.relativePath } }).catch(() => {});
            }
        }
        return NextResponse.json({ success: true }, { status: 200 });
    }

    if (action === "edit") {
        const ownerPath = String(body.path || "");
        const resolution = resolvePathWithinBase(getUserUploadPath(auth.share.ownerId), ownerPath);
        if (!resolution.isInside) return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
        const sourceRelative = path.relative(auth.source.resolvedPath, resolution.resolvedPath).replace(/\\/g, "/");
        if (sourceRelative === "" || sourceRelative.startsWith("..")) return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });
        await fs.writeFile(resolution.resolvedPath, String(body.content ?? ""), "utf8");
        const stat = await fs.stat(resolution.resolvedPath);
        await prisma.file.updateMany({
            where: { ownerId: auth.share.ownerId, path: resolution.relativePath },
            data: { size: BigInt(stat.size), updatedAt: new Date() }
        }).catch(() => {});
        return NextResponse.json({ success: true, size: stat.size }, { status: 200 });
    }

    return NextResponse.json({ success: false, code: "unknown_action" }, { status: 400 });
}
