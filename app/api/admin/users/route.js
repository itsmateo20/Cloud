// app/api/admin/users/route.js

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureAdminSession } from "@/lib/adminAuth";
import bcrypt from "bcrypt";
import { initializeUserFolder } from "@/lib/folderAuth";
import { normalizeEmailAddress } from "@/lib/email";

export async function GET() {
    try {
        const session = await getSession();
        const adminCheck = await ensureAdminSession(session);
        if (!adminCheck.success) {
            return NextResponse.json(adminCheck.response, { status: adminCheck.status });
        }

        const users = await prisma.user.findMany({
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                email: true,
                googleEmail: true,
                provider: true,
                admin: true,
                isDisabled: true,
                createdAt: true,
                updatedAt: true,
                settings: true,
            },
        });

        return NextResponse.json({ success: true, users });
    } catch (error) {
        return NextResponse.json({ success: false, code: "admin_users_failed", message: "Failed to load users" }, { status: 500 });
    }
}

export async function POST(req) {
    const check = await ensureAdminSession(await getSession());
    if (!check.success) return NextResponse.json(check.response, { status: check.status });
    try {
        const body = await req.json();
        const email = normalizeEmailAddress(body.email);
        const password = String(body.password || "");
        if (!email || password.length < 8) return NextResponse.json({ success: false, message: "Valid email and temporary password are required" }, { status: 400 });
        const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { googleEmail: email }] } });
        if (exists) return NextResponse.json({ success: false, message: "A user with that email already exists" }, { status: 409 });
        const user = await prisma.user.create({ data: { email, password: await bcrypt.hash(password, 10), provider: "credentials", settings: { create: {} } } });
        await initializeUserFolder(user.id);
        return NextResponse.json({ success: true, user: { id: user.id, email: user.email } }, { status: 201 });
    } catch {
        return NextResponse.json({ success: false, message: "Failed to create user" }, { status: 500 });
    }
}
