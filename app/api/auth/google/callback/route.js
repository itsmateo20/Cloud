// app/api/auth/google/callback/route.js

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createSession } from "@/lib/session";
import { authenticationWithGoogle } from "@/lib/auth";

import crypto from "crypto";
import { cookies } from "next/headers";
import { getSiteUrl } from "@/lib/getSiteUrl";

function signEmail(email) {
    const hmac = crypto.createHmac("sha256", process.env.AUTH_SECRET);
    hmac.update(email);
    return hmac.digest("hex");
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    // Handle OAuth errors
    if (error) {
        console.error('Google OAuth error:', error);
        return NextResponse.redirect(`${await getSiteUrl()}/login?error=oauth_error`);
    }

    if (!code) {
        console.error('No authorization code received from Google');
        return NextResponse.redirect(`${await getSiteUrl()}/login?error=no_code`);
    }

    const cookieStore = await cookies();
    const type = cookieStore.get("auth_type")?.value || "login";
    const storedState = cookieStore.get("oauth_state")?.value;

    // Verify state parameter
    if (!state || state !== storedState) {
        console.error('State parameter mismatch or missing');
        return NextResponse.redirect(`${await getSiteUrl()}/login?error=invalid_state`);
    }

    const siteUrl = await getSiteUrl();
    console.log('Using site URL for OAuth callback:', siteUrl);

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${siteUrl}/api/auth/google/callback`
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const { data: googleUser } = await oauth2.userinfo.get();

        const response = await authenticationWithGoogle(googleUser.email, type);
        if (!response.success) {
            if (type === "login") {
                if (response.code === "user_already_exists_link_google") return NextResponse.redirect(`/link-account/google?email=${encodeURIComponent(googleUser.email)}&signature=${signEmail(googleUser.email)}`);
                else if (response.code === "user_not_found") return NextResponse.redirect(`/login/google?email=${encodeURIComponent(googleUser.email)}&signature=${signEmail(googleUser.email)}`);
            } else if (type === "signup") {
                if (response.code === "user_already_exists_linked") {
                    const loginResponse = await authenticationWithGoogle(googleUser.email, "login");
                    if (!loginResponse.success) return NextResponse.json(loginResponse, { status: 500 });

                    await createSession({
                        id: loginResponse.user.id,
                        email: loginResponse.user?.email,
                        googleEmail: googleUser.email,
                        provider: loginResponse.user.provider
                    });

                    return new NextResponse(JSON.stringify({ success: true, code: "authentication_success" }), { status: 301, headers: { Location: "/" } });
                } else if (response.code === "user_not_found") return NextResponse.redirect(`${siteUrl}/signup/google?email=${encodeURIComponent(googleUser.email)}&signature=${signEmail(googleUser.email)}`);
            }

            return NextResponse.json(response, { status: 500 });
        }

        await createSession({
            id: response.user.id,
            email: response.user?.email,
            googleEmail: googleUser.email,
            provider: response.user.provider
        });

        // Clean up the oauth_state cookie
        const finalCookieStore = await cookies();
        finalCookieStore.delete("oauth_state");

        return new NextResponse(JSON.stringify({ success: true, code: "authentication_success" }), { status: 301, headers: { Location: "/" } });
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            siteUrl: siteUrl
        });
        return NextResponse.redirect(`${await getSiteUrl()}/login?error=oauth_callback_failed`);
    }
}
