// app/api/auth/google/auth/route.js

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { getSiteUrl } from "@/lib/getSiteUrl";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const siteUrl = await getSiteUrl();

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        siteUrl + "/api/auth/google/callback"
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["email", "profile"],
    });

    const cookieStore = await cookies();
    cookieStore.set("auth_type", type, {
        maxAge: 60 * 60,
        secure: process.env.NODE_ENV === "production",
        httpOnly: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });

    return NextResponse.redirect(authUrl);
}
