import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { getUserUploadPath } from "@/lib/paths";
import { isPrivateAccess } from "@/lib/privateAccess";

export async function GET(req) {
    const session = await getSession();
    if (!session?.success || !session.user?.id) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    if (!await isPrivateAccess(session.user.id)) return NextResponse.json({ success: false, code: "private_locked" }, { status: 403 });

    const requestedPath = new URL(req.url).searchParams.get("path") || "";
    const privateRoot = path.join(getUserUploadPath(session.user.id), ".private");
    const target = path.resolve(privateRoot, requestedPath);
    const relative = path.relative(privateRoot, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });

    try {
        await fs.mkdir(privateRoot, { recursive: true });
        const entries = await fs.readdir(target, { withFileTypes: true });
        const folders = [];
        const files = [];
        for (const entry of entries) {
            const childPath = path.join(target, entry.name);
            const childRelative = path.relative(privateRoot, childPath).replace(/\\/g, "/");
            if (entry.isDirectory()) folders.push({ name: entry.name, path: childRelative, type: "folder" });
            else files.push({ name: entry.name, path: childRelative, type: "file", size: (await fs.stat(childPath)).size });
        }
        return NextResponse.json({ success: true, path: requestedPath, folders, files });
    } catch {
        return NextResponse.json({ success: false, code: "private_directory_unreadable" }, { status: 404 });
    }
}

export async function POST(req) {
    const session = await getSession();
    if (!session?.success || !session.user?.id) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    if (!await isPrivateAccess(session.user.id)) return NextResponse.json({ success: false, code: "private_locked" }, { status: 403 });

    const formData = await req.formData();
    const action = String(formData.get("action") || "upload");
    const requestedPath = String(formData.get("path") || "");
    const privateRoot = path.join(getUserUploadPath(session.user.id), ".private");
    const target = path.resolve(privateRoot, requestedPath);
    const relative = path.relative(privateRoot, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return NextResponse.json({ success: false, code: "invalid_path" }, { status: 400 });

    await fs.mkdir(target, { recursive: true });

    if (action === "create_folder") {
        const name = path.basename(String(formData.get("name") || ""));
        if (!name || name === "." || name === ".." || name.includes("/")) return NextResponse.json({ success: false, message: "Invalid folder name" }, { status: 400 });
        await fs.mkdir(path.join(target, name), { recursive: true });
        return NextResponse.json({ success: true });
    }

    const files = formData.getAll("files");
    for (const file of files) {
        if (!file || typeof file === "string") continue;
        const name = path.basename(String(file.name || ""));
        if (!name || name === "." || name === "..") continue;
        const destination = path.join(target, name);
        await fs.writeFile(destination, Buffer.from(await file.arrayBuffer()));
    }
    return NextResponse.json({ success: true });
}
