import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { getPasskeyRelyingParty } from "@/lib/passkeys";

export async function GET() {
    const { rpID } = await getPasskeyRelyingParty();
    const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "preferred"
    });
    const cookieStore = await cookies();
    cookieStore.set("passkey_authentication_challenge", options.challenge, { maxAge: 300, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    return NextResponse.json({ success: true, options });
}
