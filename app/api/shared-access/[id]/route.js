import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canAccessSharedFolder, ensureSharedAccessTables, getSharedAccessFolderById } from "@/lib/sharedAccess";
import prisma from "@/lib/db";

export async function GET(req, { params }) {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const email = session.user.email || session.user.googleEmail || session.user.githubEmail || session.user.discordEmail || "";
    const access = await canAccessSharedFolder(Number(id), session.user.id, email);
    if (!access.ok) {
        return NextResponse.json({ success: false, code: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ success: true, share: access.share }, { status: 200 });
}

export async function DELETE(req, { params }) {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await ensureSharedAccessTables();
    const share = await getSharedAccessFolderById(Number(id));
    if (!share) {
        return NextResponse.json({ success: false, code: "not_found" }, { status: 404 });
    }

    if (Number(share.ownerId) === Number(session.user.id)) {
        await prisma.$executeRawUnsafe(`DELETE FROM SharedAccessMember WHERE shareId = ?`, Number(id));
        await prisma.$executeRawUnsafe(`DELETE FROM SharedAccessFolder WHERE id = ?`, Number(id));
        return NextResponse.json({ success: true, action: "deleted" }, { status: 200 });
    }

    await prisma.$executeRawUnsafe(`
        DELETE FROM SharedAccessMember WHERE shareId = ? AND userId = ?
    `, Number(id), session.user.id);

    return NextResponse.json({ success: true, action: "left" }, { status: 200 });
}
