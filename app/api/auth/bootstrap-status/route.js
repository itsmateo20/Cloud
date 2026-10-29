// app/api/auth/bootstrap-status/route.js

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getOAuthProviderStatus } from "@/lib/oauthProviders";

export async function GET() {
    try {
        const [userCount, settings, providers] = await Promise.all([
            prisma.user.count(),
            prisma.appSettings.findUnique({ where: { id: 1 } }),
            getOAuthProviderStatus()
        ]);
        return NextResponse.json({
            success: true,
            hasUsers: userCount > 0,
            signupEnabled: settings?.signupEnabled !== false,
            googleAuthEnabled: providers.google.enabled && providers.google.configured,
            githubAuthEnabled: providers.github.enabled && providers.github.configured,
            discordAuthEnabled: providers.discord.enabled && providers.discord.configured
        });
    } catch {
        return NextResponse.json({ success: false, message: "Failed to load signup status" }, { status: 500 });
    }
}