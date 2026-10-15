import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
    try {
        const [userCount, settings] = await Promise.all([
            prisma.user.count(),
            prisma.appSettings.findUnique({ where: { id: 1 } })
        ]);
        return NextResponse.json({
            success: true,
            hasUsers: userCount > 0,
            signupEnabled: settings?.signupEnabled !== false
        });
    } catch {
        return NextResponse.json({ success: false, message: "Failed to load signup status" }, { status: 500 });
    }
}