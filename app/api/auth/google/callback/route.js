// app/api/auth/google/callback/route.js

import { google } from "googleapis";
import { createSession } from "@/lib/session";
import { authenticationWithGoogle, signIn } from "@/lib/auth";

import crypto from "crypto";
import { cookies } from "next/headers";

function signEmail(email) {
    const hmac = crypto.createHmac("sha256", process.env.AUTH_SECRET);
    hmac.update(email);
    return hmac.digest("hex");
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    const cookieStore = await cookies();
    const type = cookieStore.get("auth_type")?.value || "login";

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const { data: googleUser } = await oauth2.userinfo.get();

        const response = await authenticationWithGoogle(googleUser.email, type);
        if (!response.success) {
            if (type === "login") {
                if (response.code === "user_already_exists_link_google") return new Response(null, { status: 301, headers: { Location: `/link-account/google?email=${encodeURIComponent(googleUser.email)}&signature=${signEmail(googleUser.email)}` } });
                else if (response.code === "user_not_found") return new Response(null, { status: 301, headers: { Location: `/login/google?email=${encodeURIComponent(googleUser.email)}&signature=${signEmail(googleUser.email)}` } });
            } else if (type === "signup") {
                if (response.code === "user_already_exists_linked") {
                    const loginResponse = await authenticationWithGoogle(googleUser.email, "login");
                    if (!loginResponse.success) return new Response(JSON.stringify(loginResponse), { status: 500 });

                    await createSession({
                        id: loginResponse.user.id,
                        email: loginResponse.user?.email,
                        googleEmail: googleUser.email,
                        provider: loginResponse.user.provider
                    });

                    return new Response(JSON.stringify({ success: true, code: "authentication_success" }), { status: 301, headers: { Location: "/" } });
                } else if (response.code === "user_not_found") return new Response(null, { status: 301, headers: { Location: `/signup/google?email=${encodeURIComponent(googleUser.email)}&signature=${signEmail(googleUser.email)}` } });
            }

            return new Response(JSON.stringify(response), { status: 500 });
        }

        await createSession({
            id: response.user.id,
            email: response.user?.email,
            googleEmail: googleUser.email,
            provider: response.user.provider
        });

        return new Response(JSON.stringify({ success: true, code: "authentication_success" }), { status: 301, headers: { Location: "/" } });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, code: "authentication_failed", error }), { status: 500 });
    }
}
