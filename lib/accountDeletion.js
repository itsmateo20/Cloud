// lib/accountDeletion.js

import crypto from "crypto";

function normalizeDeletionEmail(email) {
    return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function signAccountDeletionEmail(email) {
    const normalizedEmail = normalizeDeletionEmail(email);
    if (!normalizedEmail || !process.env.AUTH_SECRET) return null;

    const hmac = crypto.createHmac("sha256", process.env.AUTH_SECRET);
    hmac.update(normalizedEmail);
    return hmac.digest("hex");
}

export function verifyAccountDeletionSignature(email, signature) {
    const expectedSignature = signAccountDeletionEmail(email);
    if (!expectedSignature || !signature) return false;
    return expectedSignature === signature;
}

export function buildAccountDisabledPath(email) {
    const normalizedEmail = normalizeDeletionEmail(email);
    const signature = signAccountDeletionEmail(normalizedEmail);

    if (!normalizedEmail || !signature) return null;

    const params = new URLSearchParams({
        email: normalizedEmail,
        signature,
    });

    return `/account-disabled?${params.toString()}`;
}
