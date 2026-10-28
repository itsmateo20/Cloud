// app/api/auth/google/auth/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSiteUrl } from "@/lib/getSiteUrl";
import { getOAuthProviderConfig } from "@/lib/oauthProviders";
import crypto from "crypto";

export async function GET(req) {
    const config = await getOAuthProviderConfig("google");
    if (!config?.enabled) return NextResponse.redirect(`${await getSiteUrl()}/login?error=provider_disabled`);
    if (!config.clientId || !config.clientSecret) return NextResponse.redirect(`${await getSiteUrl()}/login?error=provider_not_configured`);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const siteUrl = await getSiteUrl();

    const { google } = await import("googleapis");
    const oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        siteUrl + "/api/auth/google/callback"
    );

    const state = crypto.randomBytes(32).toString('hex');

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["email", "profile"],
        prompt: 'consent',
        state: state
    });

    const cookieStore = await cookies();
    cookieStore.set("auth_type", type, {
        maxAge: 60 * 60,
        secure: process.env.NODE_ENV === "production",
        httpOnly: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });

    cookieStore.set("oauth_state", state, {
        maxAge: 60 * 60,
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
    });

    return NextResponse.redirect(authUrl);
}
