import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { getPasskeyRelyingParty, normalizeCredentialId } from "@/lib/passkeys";
import prisma from "@/lib/db";

export async function POST(req) {
    const session = await getSession();
    if (!session?.success) return NextResponse.json({ success: false, code: "not_authenticated" }, { status: 401 });

    try {
        const response = await req.json();
        const name = typeof response.name === "string" && response.name.trim() ? response.name.trim().slice(0, 100) : "Passkey";
        const cookieStore = await cookies();
        const expectedChallenge = cookieStore.get("passkey_registration_challenge")?.value;
        if (!expectedChallenge) return NextResponse.json({ success: false, code: "passkey_challenge_missing" }, { status: 400 });

        const { rpID, origin } = await getPasskeyRelyingParty();
        const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: false
        });
        if (!verification.verified || !verification.registrationInfo) return NextResponse.json({ success: false, code: "passkey_registration_failed" }, { status: 400 });

        const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
        await prisma.passkey.create({
            data: {
                userId: session.user.id,
                name,
                credentialId: normalizeCredentialId(credential.id),
                publicKey: Buffer.from(credential.publicKey),
                counter: credential.counter,
                transports: JSON.stringify(response.response?.transports || []),
                deviceType: credentialDeviceType,
                backedUp: credentialBackedUp
            }
        });
        cookieStore.delete("passkey_registration_challenge");
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, code: "passkey_registration_failed", error: error.message }, { status: 400 });
    }
}
