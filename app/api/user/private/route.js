import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { getUserUploadPath } from "@/lib/paths";
import prisma from "@/lib/db";

const PRIVATE_DIR = ".private";
const COOKIE_NAME = "private_access";

async function currentUser() {
    const session = await getSession();
    return session?.success && session.user?.id ? session.user : null;
}

async function hasPrivateAccess(userId) {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return false;
    try {
        const payload = jwt.verify(token, process.env.AUTH_SECRET);
        return payload?.typ === "private" && Number(payload.userId) === Number(userId);
    } catch {
        return false;
    }
}

function privatePath(userId) {
    return path.join(getUserUploadPath(userId), PRIVATE_DIR);
}

export async function GET() {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id }, select: { privateUnlockType: true } });
    return NextResponse.json({ success: true, configured: Boolean(settings?.privateUnlockType), unlocked: await hasPrivateAccess(user.id) });
}

export async function POST(req) {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const action = body.action || "unlock";
    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });

    if (action === "setup") {
        const type = body.type === "password" ? "password" : body.type === "pin" ? "pin" : null;
        const secret = String(body.secret || "");
        if (!type || (type === "pin" ? !/^\d{4,12}$/.test(secret) : secret.length < 8)) {
            return NextResponse.json({ success: false, message: type === "pin" ? "PIN must contain 4 to 12 digits" : "Password must contain at least 8 characters" }, { status: 400 });
        }
        await fs.mkdir(privatePath(user.id), { recursive: true });
        await prisma.userSettings.update({ where: { userId: user.id }, data: { privateUnlockType: type, privateUnlockHash: await bcrypt.hash(secret, 12) } });
    } else {
        if (!settings?.privateUnlockType || !settings.privateUnlockHash) return NextResponse.json({ success: false, code: "private_not_configured" }, { status: 409 });
        const valid = await bcrypt.compare(String(body.secret || ""), settings.privateUnlockHash);
        if (!valid) return NextResponse.json({ success: false, code: "private_unlock_invalid", message: "The unlock value is incorrect" }, { status: 401 });
    }

    const token = jwt.sign({ userId: user.id, typ: "private" }, process.env.AUTH_SECRET, { expiresIn: "1h" });
    (await cookies()).set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60, path: "/" });
    return NextResponse.json({ success: true, type: action === "setup" ? body.type : settings.privateUnlockType });
}

export async function DELETE() {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    (await cookies()).delete(COOKIE_NAME);
    return NextResponse.json({ success: true });
}
