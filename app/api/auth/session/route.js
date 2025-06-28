// app/api/auth/session/route.js

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

async function handleSession() {
    const session = await getSession();
    if (!session?.success) return NextResponse.json({ success: false, code: "not_authenticated" }, { status: 401 });

    return NextResponse.json({ success: true, session: { success: session.success, code: session.code }, user: session.user }, { status: 200 });
}

export async function GET() {
    return handleSession();
}

export async function POST() {
    return handleSession();
}