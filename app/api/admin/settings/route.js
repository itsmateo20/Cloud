import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureAdminSession } from "@/lib/adminAuth";

export async function GET() {
    const check = await ensureAdminSession(await getSession());
    if (!check.success) return NextResponse.json(check.response, { status: check.status });
    const settings = await prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    return NextResponse.json({ success: true, settings });
}

export async function POST(req) {
    const check = await ensureAdminSession(await getSession());
    if (!check.success) return NextResponse.json(check.response, { status: check.status });
    const body = await req.json();
    const settings = await prisma.appSettings.upsert({
        where: { id: 1 },
        update: { signupEnabled: Boolean(body.signupEnabled) },
        create: { id: 1, signupEnabled: body.signupEnabled !== false }
    });
    return NextResponse.json({ success: true, settings });
}