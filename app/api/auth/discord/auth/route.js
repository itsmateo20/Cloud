import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSiteUrl } from "@/lib/getSiteUrl";
import { getOAuthProviderConfig } from "@/lib/oauthProviders";
import crypto from "crypto";

export async function GET(req) {
    const config = await getOAuthProviderConfig("discord");
    if (!config?.enabled) return NextResponse.redirect(`${await getSiteUrl()}/login?error=provider_disabled`);
    if (!config.clientId || !config.clientSecret) return NextResponse.redirect(`${await getSiteUrl()}/login?error=provider_not_configured`);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") === "signup" ? "signup" : "login";
    const siteUrl = await getSiteUrl();
    const state = crypto.randomBytes(32).toString("hex");
    const authUrl = new URL("https://discord.com/oauth2/authorize");
    authUrl.searchParams.set("client_id", config.clientId);
    authUrl.searchParams.set("redirect_uri", `${siteUrl}/api/auth/discord/callback`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "identify email");
    authUrl.searchParams.set("state", state);

    const cookieStore = await cookies();
    cookieStore.set("auth_type", type, { maxAge: 60 * 60, secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax" });
    cookieStore.set("oauth_state", state, { maxAge: 60 * 60, secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax" });

    return NextResponse.redirect(authUrl);
}
