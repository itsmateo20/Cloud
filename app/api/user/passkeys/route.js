// app/api/user/passkeys/route.js

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/db";

export async function GET() {
    const session = await getSession();
    if (!session?.success) return NextResponse.json({ success: false, code: "not_authenticated" }, { status: 401 });
    const passkeys = await prisma.passkey.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, credentialId: true, deviceType: true, backedUp: true, createdAt: true } });
    return NextResponse.json({ success: true, passkeys });
}

export async function DELETE(req) {
    const session = await getSession();
    if (!session?.success) return NextResponse.json({ success: false, code: "not_authenticated" }, { status: 401 });
    const { id } = await req.json();
    await prisma.passkey.deleteMany({ where: { id: Number(id), userId: session.user.id } });
    return NextResponse.json({ success: true });
}
