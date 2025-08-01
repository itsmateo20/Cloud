// app/api/auth/google/auth/route.js

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { getSiteUrl } from "@/lib/getSiteUrl";
import crypto from "crypto";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const siteUrl = await getSiteUrl();
    console.log('Google OAuth - Site URL:', siteUrl);
    console.log('Google OAuth - Callback URL:', siteUrl + "/api/auth/google/callback");

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        siteUrl + "/api/auth/google/callback"
    );

    const state = crypto.randomBytes(32).toString('hex');

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["email", "profile"],
        // Force consent to avoid caching issues with private IPs
        prompt: 'consent',
        // Add state parameter for security
        state: state
    });

    const cookieStore = await cookies();
    cookieStore.set("auth_type", type, {
        maxAge: 60 * 60,
        secure: process.env.NODE_ENV === "production",
        httpOnly: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });

    // Store state for verification
    cookieStore.set("oauth_state", state, {
        maxAge: 60 * 60,
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
    });

    return NextResponse.redirect(authUrl);
}
