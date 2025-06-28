// app/api/auth/login.js

import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(req) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) return NextResponse.json({ success: false, code: "email_password_missing" }, { status: 400 });
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return NextResponse.json({ success: false, code: "invalid_email" }, { status: 400 });

        const response = await signIn(email, password);

        if (!response.success) return NextResponse.json({ success: false, code: response.code, error: response.error }, { status: 500 });

        await createSession({ id: response.user.id, email: response.user.email, googleEmail: response.user?.googleEmail, provider: response.user.provider });
        return NextResponse.json({ success: true, code: "login_success", user: response.user }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "login_error", error }, { status: 500 });
    }
}