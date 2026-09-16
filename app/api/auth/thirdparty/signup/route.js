// app/api/auth/thirdparty/signup/route.js

import { NextResponse } from "next/server";
import { signUpWithThirdParty } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { normalizeEmailAddress } from "@/lib/email";

export async function POST(req) {
    try {
        const { email, password, type, signature } = await req.json();
        if (!email || !password || !type || !signature) return NextResponse.json({ success: false, code: "email_password_signature_missing" }, { status: 400 });
        const normalizedEmail = normalizeEmailAddress(email);
        if (!normalizedEmail) return NextResponse.json({ success: false, code: "invalid_email" }, { status: 400 });

        const response = await signUpWithThirdParty(normalizedEmail, password, type, signature);

        if (!response.success) return NextResponse.json({ success: false, code: response?.code, error: response?.error }, { status: 500 });

        let session;
        if (type === "google" && response.user?.googleEmail) {
            session = await createSession({ id: response.user.id, email: response.user.email, googleEmail: response.user?.googleEmail, provider: response.user.provider }, req);
        } else {
            session = await createSession({ id: response.user.id, email: response.user.email, provider: response.user.provider }, req);
        }
        if (!session.success) {
            return NextResponse.json({ success: false, code: session.code || "session_creation_failed" }, { status: 500 });
        }
        return NextResponse.json({ success: true, code: "signup_success", user: response.user }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "signup_failed", error }, { status: 500 });
    }
}