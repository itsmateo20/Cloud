import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTrashEntries, permanentlyDeleteTrashItem, purgeExpiredTrash, restoreFromTrash } from "@/lib/trash";
import prisma from "@/lib/db";

export async function GET() {
    const session = await getSession();
    if (!session?.success || !session.user?.id) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    try {
        await purgeExpiredTrash(session.user.id);
        return NextResponse.json({ success: true, items: await getTrashEntries(session.user.id) });
    } catch {
        return NextResponse.json({ success: false, message: "Failed to load bin" }, { status: 500 });
    }
}

export async function POST(req) {
    const session = await getSession();
    if (!session?.success || !session.user?.id) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    try {
        const { action, id } = await req.json();
        const item = action === "restore"
            ? await restoreFromTrash(session.user.id, id)
            : await permanentlyDeleteTrashItem(session.user.id, id);
        if (action !== "restore") {
            await prisma.file.deleteMany({ where: { ownerId: session.user.id, OR: [{ path: item.originalPath }, { path: { startsWith: `${item.originalPath}/` } }] } });
            await prisma.folder.deleteMany({ where: { ownerId: session.user.id, OR: [{ path: item.originalPath }, { path: { startsWith: `${item.originalPath}/` } }] } });
        }
        try {
            global.io?.to(`user:${session.user.id}`).emit("trash-updated", { userId: session.user.id, action });
        } catch { }
        return NextResponse.json({ success: true, item });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message || "Bin operation failed" }, { status: 400 });
    }
}