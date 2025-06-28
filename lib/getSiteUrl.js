// lib/getSiteUrl.js

import { headers } from "next/headers";

export async function getSiteUrl() {
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = headersList.get("x-forwarded-proto") || "https";
    if (!host) {
        throw new Error("Host header is not available");
    }
    return `${protocol}://${host}`;
}