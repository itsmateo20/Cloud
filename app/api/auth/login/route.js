// app/api/auth/login/route.js

import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { normalizeEmailAddress } from "@/lib/email";

export async function POST(req) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) return NextResponse.json({ success: false, code: "email_password_missing" }, { status: 400 });
        const normalizedEmail = normalizeEmailAddress(email);
        if (!normalizedEmail) return NextResponse.json({ success: false, code: "invalid_email" }, { status: 400 });

        const response = await signIn(normalizedEmail, password);

        if (!response.success) {
            const status = response.code === "account_deleted" ? 403 : 500;
            return NextResponse.json(
                {
                    success: false,
                    code: response.code,
                    error: response.error,
                    email: response.email,
                    signature: response.signature,
                    deletionScheduledAt: response.deletionScheduledAt,
                },
                { status }
            );
        }

        await createSession({ id: response.user.id, email: response.user.email, googleEmail: response.user?.googleEmail, provider: response.user.provider, admin: response.user.admin }, req);
        return NextResponse.json({ success: true, code: "login_success", user: response.user }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "login_failed", error }, { status: 500 });
    }
}