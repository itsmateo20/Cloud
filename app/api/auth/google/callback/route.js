// app/api/auth/google/callback/route.js

import { google } from "googleapis";
import { createSession } from "@/lib/session";
import { authenticationWithGoogle } from "@/lib/auth";

import crypto from "crypto";

function signEmail(email) {
    const hmac = crypto.createHmac("sha256", process.env.AUTH_SECRET);
    hmac.update(email);
    return hmac.digest("hex");
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: googleUser } = await oauth2.userinfo.get();

        const response = await authenticationWithGoogle(googleUser.email);
        if (!response.success) {
            if (response.code === "user_already_exists_connect_google") return new Response(null, { status: 301, headers: { Location: `/connect-account?email=${encodeURIComponent(response.googleEmail)}&signature=${signEmail(response.googleEmail)}&type=google` } });
            return new Response(JSON.stringify(response), { status: 500 });
        }

        await createSession({ id: response.user.id, googleEmail: googleUser.email, provider: response.user.provider });

        return new Response(JSON.stringify({ success: true, code: 'authentication_success' }), { status: 301, headers: { Location: "/" } });
    } catch (error) {
        console.log(error);
        return new Response(JSON.stringify({ success: false, code: 'authentication_failed' }), { status: 500 });
    }
}
