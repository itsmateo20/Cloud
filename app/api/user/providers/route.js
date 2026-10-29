import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { unlinkProviderFromUser } from "@/lib/auth";
import prisma from "@/lib/db";

const providers = ["google", "github", "discord"];

export async function GET() {
    const session = await getSession();
    if (!session?.success) return NextResponse.json({ success: false, code: "not_authenticated" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { googleEmail: true, githubEmail: true, discordEmail: true } });
    return NextResponse.json({
        success: true,
        providers: Object.fromEntries(providers.map((provider) => [provider, Boolean(user?.[`${provider}Email`])] ))
    });
}

export async function DELETE(req) {
    const session = await getSession();
    if (!session?.success) return NextResponse.json({ success: false, code: "not_authenticated" }, { status: 401 });
    const { provider } = await req.json();
    if (!providers.includes(provider)) return NextResponse.json({ success: false, code: "invalid_provider" }, { status: 400 });
    const response = await unlinkProviderFromUser(session.user.id, provider);
    if (!response.success) return NextResponse.json(response, { status: 400 });
    return NextResponse.json({ success: true, providers: Object.fromEntries(providers.map((item) => [item, Boolean(response.user[`${item}Email`])] )) });
}
