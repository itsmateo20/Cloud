// app/api/auth/github/callback/route.js

import { NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import { authenticationWithProvider } from "@/lib/auth";
import { buildAccountDisabledPath } from "@/lib/accountDeletion";
import crypto from "crypto";
import { cookies } from "next/headers";
import { getSiteUrl } from "@/lib/getSiteUrl";
import { getOAuthProviderConfig } from "@/lib/oauthProviders";

function signEmail(email) {
    const hmac = crypto.createHmac("sha256", process.env.AUTH_SECRET);
    hmac.update(email);
    return hmac.digest("hex");
}

async function githubRequest(url, options) {
    const response = await fetch(url, { ...options, headers: { Accept: "application/json", ...options?.headers } });
    if (!response.ok) throw new Error(`GitHub request failed with ${response.status}`);
    return response.json();
}

export async function GET(req) {
    const config = await getOAuthProviderConfig("github");
    if (!config?.enabled) return NextResponse.redirect(`${await getSiteUrl()}/login?error=provider_disabled`);
    if (!config.clientId || !config.clientSecret) return NextResponse.redirect(`${await getSiteUrl()}/login?error=provider_not_configured`);

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");
    const siteUrl = await getSiteUrl();
    if (error) return NextResponse.redirect(`${siteUrl}/login?error=oauth_error`);
    if (!code) return NextResponse.redirect(`${siteUrl}/login?error=no_code`);

    const cookieStore = await cookies();
    const type = cookieStore.get("auth_type")?.value || "login";
    const storedState = cookieStore.get("oauth_state")?.value;
    if (!state || state !== storedState) return NextResponse.redirect(`${siteUrl}/login?error=invalid_state`);

    try {
        const token = await githubRequest("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: `${siteUrl}/api/auth/github/callback`, state })
        });
        if (!token.access_token) throw new Error("GitHub access token missing");

        const headers = { Authorization: `Bearer ${token.access_token}` };
        const githubUser = await githubRequest("https://api.github.com/user", { headers });
        const emails = await githubRequest("https://api.github.com/user/emails", { headers });
        const email = emails.find((item) => item.primary && item.verified)?.email || emails.find((item) => item.verified)?.email;
        if (!email) return NextResponse.redirect(`${siteUrl}/login?error=oauth_email_missing`);

        const response = await authenticationWithProvider(email, type, "github");
        if (!response.success) {
            if (response.code === "account_deleted") {
                const disabledPath = buildAccountDisabledPath(response.email || email);
                return NextResponse.redirect(`${siteUrl}${disabledPath || "/login?error=account_deleted"}`);
            }
            if (type === "login" && response.code === "user_already_exists_link_github") return NextResponse.redirect(`${siteUrl}/login/github?email=${encodeURIComponent(email)}&signature=${signEmail(email)}`);
            if (type === "login" && response.code === "user_not_found") return NextResponse.redirect(`${siteUrl}/login/github?email=${encodeURIComponent(email)}&signature=${signEmail(email)}`);
            if (type === "signup" && response.code === "user_already_exists_linked") {
                const loginResponse = await authenticationWithProvider(email, "login", "github");
                await createSession({ id: loginResponse.user.id, email: loginResponse.user.email, githubEmail: email, provider: loginResponse.user.provider, admin: loginResponse.user.admin }, req);
                return new NextResponse(null, { status: 303, headers: { Location: siteUrl } });
            }
            if (type === "signup" && response.code === "user_not_found") return NextResponse.redirect(`${siteUrl}/signup/github?email=${encodeURIComponent(email)}&signature=${signEmail(email)}`);
            return NextResponse.json(response, { status: 500 });
        }

        await createSession({ id: response.user.id, email: response.user.email, githubEmail: email, provider: response.user.provider, admin: response.user.admin }, req);
        cookieStore.delete("oauth_state");
        cookieStore.delete("auth_type");
        return new NextResponse(null, { status: 303, headers: { Location: siteUrl } });
    } catch {
        return NextResponse.redirect(`${siteUrl}/login?error=oauth_callback_failed`);
    }
}