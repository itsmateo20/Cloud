// app/api/auth/thirdparty/signup/route.js

import { signUpWithThirdParty } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(req) {
    try {
        const { email, password, type, signature } = await req.json();
        if (!email || !password || !type || !signature) return new Response(JSON.stringify({ success: false, code: "email_password_signature_missing" }), { status: 400 });
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return new Response(JSON.stringify({ success: false, code: "invalid_email" }), { status: 400 });

        const response = await signUpWithThirdParty(email, password, type, signature);

        if (!response.success) return new Response(JSON.stringify({ success: false, code: response?.code, error: response?.error }), { status: 500 });

        if (type === "google" && response.user?.googleEmail) {
            await createSession({ id: response.user.id, email: response.user.email, googleEmail: response.user?.googleEmail, provider: response.user.provider });
        } else {
            await createSession({ id: response.user.id, email: response.user.email, provider: response.user.provider });
        }
        return new Response(JSON.stringify({ success: true, code: "signup_success", user: response.user }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, code: "signup_error", error }), { status: 500 });
    }
}