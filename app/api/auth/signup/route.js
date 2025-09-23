// app/api/auth/signup/route.js

import { NextResponse } from "next/server";
import { signUp } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(req) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) return NextResponse.json({ success: false, code: "email_password_missing", message: "Email and password are required." }, { status: 400 });

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return NextResponse.json({ success: false, code: "invalid_email", message: "Invalid email format." }, { status: 400 });

        const response = await signUp(email, password);

        if (!response.success) return NextResponse.json({ success: false, code: response?.code, message: response?.error || "Signup failed." }, { status: 500 });

        await createSession({
            id: response.user.id,
            email: response.user.email,
            googleEmail: response.user?.googleEmail,
            provider: response.user.provider
        });

        return NextResponse.json({ success: true, code: "signup_success", user: response.user }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "signup_failed", message: error?.message || "Signup failed." }, { status: 500 });
    }
}