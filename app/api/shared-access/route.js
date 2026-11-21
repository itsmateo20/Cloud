import { NextResponse } from "next/server";
import fs from "fs/promises";
import sanitizeFilename from "sanitize-filename";
import { getSession } from "@/lib/session";
import { getUserUploadPath, resolvePathWithinBase } from "@/lib/paths";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { createSharedAccessFolder, getSharedAccessFoldersForUser } from "@/lib/sharedAccess";

export async function GET() {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    try {
        const email = session.user.email || session.user.googleEmail || session.user.githubEmail || session.user.discordEmail || "";
        const shares = await getSharedAccessFoldersForUser(session.user.id, email);
        const normalized = (shares || []).map((share) => ({
            id: Number(share.id),
            ownerId: Number(share.ownerId),
            ownerEmail: share.ownerEmail,
            folderPath: share.folderPath,
            name: share.name,
            isOwner: Boolean(share.isOwner),
            allowedEmails: (() => {
                try { return JSON.parse(share.allowedEmails || "[]"); } catch { return []; }
            })(),
            createdAt: share.createdAt
        }));
        return NextResponse.json({ success: true, shares: normalized }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "shared_access_list_failed", message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const folderPath = String(body.folderPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        const name = sanitizeFilename(String(body.name || "").trim()) || "Shared Folder";
        const allowedEmails = Array.isArray(body.allowedEmails) ? body.allowedEmails : [];

        const ownership = await verifyFolderOwnership(session.user.id);
        if (!ownership.isValid) {
            return NextResponse.json({ success: false, code: "folder_auth_failed", message: ownership.error }, { status: 403 });
        }

        const userFolder = getUserUploadPath(session.user.id);
        const resolution = resolvePathWithinBase(userFolder, folderPath);
        if (!resolution.isInside || !folderPath) {
            return NextResponse.json({ success: false, code: "invalid_folder_path" }, { status: 400 });
        }

        const stat = await fs.stat(resolution.resolvedPath);
        if (!stat.isDirectory()) {
            return NextResponse.json({ success: false, code: "folder_not_found" }, { status: 404 });
        }

        const share = await createSharedAccessFolder({
            ownerId: session.user.id,
            folderPath: resolution.relativePath,
            name,
            allowedEmails
        });

        return NextResponse.json({ success: true, share }, { status: 201 });
    } catch (error) {
        if (error.code === "shared_access_user_not_found") {
            return NextResponse.json({ success: false, code: error.code, message: error.message }, { status: 400 });
        }
        return NextResponse.json({ success: false, code: "shared_access_create_failed", message: error.message }, { status: 500 });
    }
}
