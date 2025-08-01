// lib/getSiteUrl.js
"use server";

import { headers } from "next/headers";

export async function getSiteUrl() {
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = headersList.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");

    if (!host) {
        throw new Error("Host header is not available");
    }

    if (process.env.NODE_ENV !== "production") {
        const isPrivateIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(host);

        if (isPrivateIP) {
            const portMatch = host.match(/:(\d+)$/);
            const port = portMatch ? portMatch[1] : '';
            const localhostHost = port ? `localhost:${port}` : 'localhost';

            return `${protocol}://${localhostHost}`;
        }
    }

    return `${protocol}://${host}`;
}