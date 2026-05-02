// lib/email.js

export function normalizeEmailAddress(email) {
    if (typeof email !== "string") return null;

    const normalizedEmail = email.trim();
    if (normalizedEmail.length < 3 || normalizedEmail.length > 254) return null;
    if (normalizedEmail.includes(" ") || normalizedEmail.includes("\t") || normalizedEmail.includes("\r") || normalizedEmail.includes("\n") || normalizedEmail.includes("\0")) return null;

    const atIndex = normalizedEmail.indexOf("@");
    if (atIndex <= 0 || atIndex !== normalizedEmail.lastIndexOf("@") || atIndex === normalizedEmail.length - 1) return null;

    const localPart = normalizedEmail.slice(0, atIndex);
    const domainPart = normalizedEmail.slice(atIndex + 1);
    if (localPart.length > 64 || domainPart.length > 253) return null;
    if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) return null;
    if (domainPart.startsWith(".") || domainPart.endsWith(".") || domainPart.includes("..")) return null;

    const domainLabels = domainPart.split(".");
    if (domainLabels.length < 2) return null;

    for (const label of domainLabels) {
        if (!label || label.length > 63) return null;
        if (label.startsWith("-") || label.endsWith("-")) return null;
    }

    return normalizedEmail;
}
