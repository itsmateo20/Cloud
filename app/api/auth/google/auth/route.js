// app/api/auth/google/auth/route.js

import { google } from "googleapis";
import { cookies } from "next/headers";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
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

    return new Response(null, { status: 302, headers: { Location: authUrl } });
}
