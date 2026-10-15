// app/api/auth/signup/route.js

import { NextResponse } from "next/server";
import { signUp } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { normalizeEmailAddress } from "@/lib/email";
import prisma from "@/lib/db";

export async function POST(req) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) return NextResponse.json({ success: false, code: "email_password_missing", message: "Email and password are required." }, { status: 400 });

        const normalizedEmail = normalizeEmailAddress(email);
        if (!normalizedEmail) return NextResponse.json({ success: false, code: "invalid_email", message: "Invalid email format." }, { status: 400 });

        const userCount = await prisma.user.count();
        const appSettings = await prisma.appSettings.findUnique({ where: { id: 1 } });
        if (userCount > 0 && appSettings?.signupEnabled === false) {
            return NextResponse.json({ success: false, code: "signup_disabled", message: "Sign up is currently disabled." }, { status: 403 });
        }

        const response = await signUp(normalizedEmail, password);

        if (!response.success) return NextResponse.json({ success: false, code: response?.code, message: response?.error || "Signup failed." }, { status: 500 });

        if (userCount === 0) {
            await prisma.user.update({ where: { id: response.user.id }, data: { admin: true } });
            response.user.admin = true;
        }

        const session = await createSession({
            id: response.user.id,
            email: response.user.email,
            googleEmail: response.user?.googleEmail,
            provider: response.user.provider,
            admin: response.user.admin
        }, req);
        if (!session.success) {
            return NextResponse.json({ success: false, code: session.code || "session_creation_failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true, code: "signup_success", user: response.user }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "signup_failed", message: error?.message || "Signup failed." }, { status: 500 });
    }
}