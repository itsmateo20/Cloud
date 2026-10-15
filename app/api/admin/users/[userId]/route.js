import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureAdminSession, parseUserId } from "@/lib/adminAuth";
import fs from "fs/promises";
import { getUserUploadPath } from "@/lib/paths";

async function authorize() {
    return ensureAdminSession(await getSession());
}

export async function PATCH(req, context) {
    const check = await authorize();
    if (!check.success) return NextResponse.json(check.response, { status: check.status });
    const userId = parseUserId((await context.params)?.userId);
    const body = await req.json();
    if (!userId) return NextResponse.json({ success: false, message: "Invalid user" }, { status: 400 });
    const user = await prisma.user.update({ where: { id: userId }, data: { ...(body.admin !== undefined ? { admin: Boolean(body.admin) } : {}), ...(body.isDisabled !== undefined ? { isDisabled: Boolean(body.isDisabled) } : {}) } });
    return NextResponse.json({ success: true, user: { id: user.id, admin: user.admin, isDisabled: user.isDisabled } });
}

export async function DELETE(_req, context) {
    const session = await getSession();
    const check = await ensureAdminSession(session);
    if (!check.success) return NextResponse.json(check.response, { status: check.status });
    const userId = parseUserId((await context.params)?.userId);
    if (!userId || userId === session.user.id) return NextResponse.json({ success: false, message: "Cannot remove this account" }, { status: 400 });
    await prisma.user.delete({ where: { id: userId } });
    await fs.rm(getUserUploadPath(userId), { recursive: true, force: true });
    return NextResponse.json({ success: true });
}