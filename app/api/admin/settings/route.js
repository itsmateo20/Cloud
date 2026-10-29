import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureAdminSession } from "@/lib/adminAuth";

export async function GET() {
    const check = await ensureAdminSession(await getSession());
    if (!check.success) return NextResponse.json(check.response, { status: check.status });
    const settings = await prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    return NextResponse.json({
        success: true,
        settings: {
            ...settings,
            googleClientSecret: undefined,
            githubClientSecret: undefined,
            discordClientSecret: undefined,
            googleClientSecretConfigured: Boolean(settings.googleClientSecret),
            githubClientSecretConfigured: Boolean(settings.githubClientSecret),
            discordClientSecretConfigured: Boolean(settings.discordClientSecret)
        }
    });
}

export async function POST(req) {
    const check = await ensureAdminSession(await getSession());
    if (!check.success) return NextResponse.json(check.response, { status: check.status });
    const body = await req.json();
    const settings = await prisma.appSettings.upsert({
        where: { id: 1 },
        update: {
            ...(typeof body.signupEnabled === "boolean" ? { signupEnabled: body.signupEnabled } : {}),
            ...(typeof body.googleAuthEnabled === "boolean" ? { googleAuthEnabled: body.googleAuthEnabled } : {}),
            ...(typeof body.githubAuthEnabled === "boolean" ? { githubAuthEnabled: body.githubAuthEnabled } : {}),
            ...(typeof body.discordAuthEnabled === "boolean" ? { discordAuthEnabled: body.discordAuthEnabled } : {}),
            ...(typeof body.googleClientId === "string" ? { googleClientId: body.googleClientId.trim() || null } : {}),
            ...(typeof body.githubClientId === "string" ? { githubClientId: body.githubClientId.trim() || null } : {}),
            ...(typeof body.discordClientId === "string" ? { discordClientId: body.discordClientId.trim() || null } : {}),
            ...(typeof body.googleClientSecret === "string" && body.googleClientSecret.trim() ? { googleClientSecret: body.googleClientSecret.trim() } : {}),
            ...(typeof body.githubClientSecret === "string" && body.githubClientSecret.trim() ? { githubClientSecret: body.githubClientSecret.trim() } : {}),
            ...(typeof body.discordClientSecret === "string" && body.discordClientSecret.trim() ? { discordClientSecret: body.discordClientSecret.trim() } : {})
        },
        create: {
            id: 1,
            signupEnabled: body.signupEnabled !== false,
            googleAuthEnabled: body.googleAuthEnabled !== false,
            githubAuthEnabled: body.githubAuthEnabled !== false,
            discordAuthEnabled: body.discordAuthEnabled !== false,
            googleClientId: typeof body.googleClientId === "string" ? body.googleClientId.trim() || null : null,
            googleClientSecret: typeof body.googleClientSecret === "string" ? body.googleClientSecret.trim() || null : null,
            githubClientId: typeof body.githubClientId === "string" ? body.githubClientId.trim() || null : null,
            githubClientSecret: typeof body.githubClientSecret === "string" ? body.githubClientSecret.trim() || null : null,
            discordClientId: typeof body.discordClientId === "string" ? body.discordClientId.trim() || null : null,
            discordClientSecret: typeof body.discordClientSecret === "string" ? body.discordClientSecret.trim() || null : null
        }
    });
    return NextResponse.json({
        success: true,
        settings: {
            ...settings,
            googleClientSecret: undefined,
            githubClientSecret: undefined,
            discordClientSecret: undefined,
            googleClientSecretConfigured: Boolean(settings.googleClientSecret),
            githubClientSecretConfigured: Boolean(settings.githubClientSecret),
            discordClientSecretConfigured: Boolean(settings.discordClientSecret)
        }
    });
}