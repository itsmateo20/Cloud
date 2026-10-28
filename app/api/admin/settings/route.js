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
            googleClientSecretConfigured: Boolean(settings.googleClientSecret),
            githubClientSecretConfigured: Boolean(settings.githubClientSecret)
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
            ...(typeof body.googleClientId === "string" ? { googleClientId: body.googleClientId.trim() || null } : {}),
            ...(typeof body.githubClientId === "string" ? { githubClientId: body.githubClientId.trim() || null } : {}),
            ...(typeof body.googleClientSecret === "string" && body.googleClientSecret.trim() ? { googleClientSecret: body.googleClientSecret.trim() } : {}),
            ...(typeof body.githubClientSecret === "string" && body.githubClientSecret.trim() ? { githubClientSecret: body.githubClientSecret.trim() } : {})
        },
        create: {
            id: 1,
            signupEnabled: body.signupEnabled !== false,
            googleAuthEnabled: body.googleAuthEnabled !== false,
            githubAuthEnabled: body.githubAuthEnabled !== false,
            googleClientId: typeof body.googleClientId === "string" ? body.googleClientId.trim() || null : null,
            googleClientSecret: typeof body.googleClientSecret === "string" ? body.googleClientSecret.trim() || null : null,
            githubClientId: typeof body.githubClientId === "string" ? body.githubClientId.trim() || null : null,
            githubClientSecret: typeof body.githubClientSecret === "string" ? body.githubClientSecret.trim() || null : null
        }
    });
    return NextResponse.json({
        success: true,
        settings: {
            ...settings,
            googleClientSecret: undefined,
            githubClientSecret: undefined,
            googleClientSecretConfigured: Boolean(settings.googleClientSecret),
            githubClientSecretConfigured: Boolean(settings.githubClientSecret)
        }
    });
}