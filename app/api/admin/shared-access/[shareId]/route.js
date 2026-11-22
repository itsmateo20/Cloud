import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sanitizeFilename from "sanitize-filename";
import prisma from "@/lib/db";
import { ensureAdminSession, parseUserId } from "@/lib/adminAuth";
import { getSession } from "@/lib/session";
import { getUserUploadPath, resolvePathWithinBase } from "@/lib/paths";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { ensureSharedAccessTables, getSharedAccessFolderById, updateSharedAccessFolder } from "@/lib/sharedAccess";

export async function PATCH(req, { params }) {
    const check = await ensureAdminSession(await getSession());
    if (!check.success) return NextResponse.json(check.response, { status: check.status });

    try {
        const { shareId: rawShareId } = await params;
        const shareId = parseUserId(rawShareId);
        if (!shareId) {
            return NextResponse.json({ success: false, code: "invalid_share_id", message: "Invalid shared access folder" }, { status: 400 });
        }

        await ensureSharedAccessTables();
        const existingShare = await getSharedAccessFolderById(shareId);
        if (!existingShare) {
            return NextResponse.json({ success: false, code: "share_not_found", message: "Shared access folder not found" }, { status: 404 });
        }

        const body = await req.json();
        const folderPath = String(body.folderPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        const name = sanitizeFilename(String(body.name || "").trim());
        if (!folderPath || !name || !Array.isArray(body.allowedEmails)) {
            return NextResponse.json({ success: false, code: "invalid_shared_access_settings", message: "A folder path, name, and allowed email list are required" }, { status: 400 });
        }

        const ownership = await verifyFolderOwnership(existingShare.ownerId);
        if (!ownership.isValid) {
            return NextResponse.json({ success: false, code: "folder_auth_failed", message: ownership.error }, { status: 403 });
        }

        const ownerFolder = getUserUploadPath(existingShare.ownerId);
        const resolution = resolvePathWithinBase(ownerFolder, folderPath);
        if (!resolution.isInside || !resolution.relativePath) {
            return NextResponse.json({ success: false, code: "invalid_folder_path", message: "Folder path must be inside the owner's storage" }, { status: 400 });
        }
        const [realOwnerFolder, realFolderPath] = await Promise.all([
            fs.realpath(ownerFolder),
            fs.realpath(resolution.resolvedPath)
        ]);
        const pathFromOwner = path.relative(realOwnerFolder, realFolderPath);
        if (!pathFromOwner || pathFromOwner.startsWith(`..${path.sep}`) || pathFromOwner === ".." || path.isAbsolute(pathFromOwner)) {
            return NextResponse.json({ success: false, code: "invalid_folder_path", message: "Folder path must be inside the owner's storage" }, { status: 400 });
        }
        const stat = await fs.stat(realFolderPath);
        if (!stat.isDirectory()) {
            return NextResponse.json({ success: false, code: "folder_not_found", message: "The selected path is not a folder" }, { status: 404 });
        }

        const updated = await updateSharedAccessFolder(shareId, {
            folderPath: resolution.relativePath,
            name,
            allowedEmails: body.allowedEmails
        });
        if (!updated) {
            return NextResponse.json({ success: false, code: "share_not_found", message: "Shared access folder not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error.code === "shared_access_user_not_found") {
            return NextResponse.json({ success: false, code: error.code, message: error.message }, { status: 400 });
        }
        if (error.code === "ENOENT" || error.code === "ENOTDIR") {
            return NextResponse.json({ success: false, code: "folder_not_found", message: "The selected folder does not exist" }, { status: 404 });
        }
        return NextResponse.json({ success: false, code: "admin_shared_access_update_failed", message: "Failed to update shared access folder" }, { status: 500 });
    }
}

export async function DELETE(_req, { params }) {
    const check = await ensureAdminSession(await getSession());
    if (!check.success) return NextResponse.json(check.response, { status: check.status });

    try {
        const { shareId: rawShareId } = await params;
        const shareId = parseUserId(rawShareId);
        if (!shareId) {
            return NextResponse.json({ success: false, code: "invalid_share_id", message: "Invalid shared access folder" }, { status: 400 });
        }

        await ensureSharedAccessTables();
        const result = await prisma.$transaction([
            prisma.$executeRawUnsafe(`DELETE FROM SharedAccessMember WHERE shareId = ?`, shareId),
            prisma.$executeRawUnsafe(`DELETE FROM SharedAccessFolder WHERE id = ?`, shareId)
        ]);
        if (result[1] === 0) {
            return NextResponse.json({ success: false, code: "share_not_found", message: "Shared access folder not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, code: "admin_shared_access_delete_failed", message: "Failed to remove shared access folder" }, { status: 500 });
    }
}
