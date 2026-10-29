import { getSiteUrl } from "@/lib/getSiteUrl";

export function normalizeCredentialId(value) {
    return String(value || "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

export async function getPasskeyRelyingParty() {
    const siteUrl = await getSiteUrl();
    const url = new URL(siteUrl);
    return {
        siteUrl,
        origin: url.origin,
        rpID: url.hostname,
        rpName: process.env.PASSKEY_RP_NAME || "Cloud Storage"
    };
}
