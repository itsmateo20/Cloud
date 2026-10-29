import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { getPasskeyRelyingParty } from "@/lib/passkeys";
import prisma from "@/lib/db";

export async function GET() {
    const session = await getSession();
    if (!session?.success) return NextResponse.json({ success: false, code: "not_authenticated" }, { status: 401 });

    const { rpID, rpName } = await getPasskeyRelyingParty();
    const passkeys = await prisma.passkey.findMany({ where: { userId: session.user.id }, select: { credentialId: true } });
    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: session.user.email || `user-${session.user.id}`,
        userDisplayName: session.user.email || `User ${session.user.id}`,
        userID: new Uint8Array(Buffer.from(String(session.user.id))),
        attestationType: "none",
        excludeCredentials: passkeys.map((passkey) => ({ id: passkey.credentialId })),
        authenticatorSelection: { residentKey: "required", userVerification: "preferred" }
    });

    const cookieStore = await cookies();
    cookieStore.set("passkey_registration_challenge", options.challenge, { maxAge: 300, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    return NextResponse.json({ success: true, options });
}
