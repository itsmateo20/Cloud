import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { getPasskeyRelyingParty, normalizeCredentialId } from "@/lib/passkeys";
import { createSession } from "@/lib/session";
import prisma from "@/lib/db";

export async function POST(req) {
    try {
        const response = await req.json();
        const cookieStore = await cookies();
        const expectedChallenge = cookieStore.get("passkey_authentication_challenge")?.value;
        if (!expectedChallenge) return NextResponse.json({ success: false, code: "passkey_challenge_missing" }, { status: 400 });

        const credentialId = normalizeCredentialId(response.id || response.rawId);
        let passkey = await prisma.passkey.findUnique({ where: { credentialId }, include: { user: true } });
        if (!passkey) {
            const storedPasskeys = await prisma.passkey.findMany({ include: { user: true } });
            passkey = storedPasskeys.find((entry) => normalizeCredentialId(entry.credentialId) === credentialId);
        }
        if (!passkey) return NextResponse.json({ success: false, code: "passkey_not_found" }, { status: 404 });

        const { rpID, origin } = await getPasskeyRelyingParty();
        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: passkey.credentialId,
                publicKey: new Uint8Array(passkey.publicKey),
                counter: passkey.counter,
                transports: JSON.parse(passkey.transports || "[]")
            },
            requireUserVerification: false
        });
        if (!verification.verified) return NextResponse.json({ success: false, code: "passkey_authentication_failed" }, { status: 401 });

        await prisma.passkey.update({ where: { id: passkey.id }, data: { counter: verification.authenticationInfo.newCounter } });
        const session = await createSession({ id: passkey.user.id, email: passkey.user.email, googleEmail: passkey.user.googleEmail, githubEmail: passkey.user.githubEmail, discordEmail: passkey.user.discordEmail, provider: passkey.user.provider, admin: passkey.user.admin }, req);
        if (!session.success) return NextResponse.json({ success: false, code: session.code || "session_creation_failed" }, { status: 500 });

        cookieStore.delete("passkey_authentication_challenge");
        return NextResponse.json({ success: true, user: passkey.user });
    } catch (error) {
        return NextResponse.json({ success: false, code: "passkey_authentication_failed", error: error.message }, { status: 401 });
    }
}
