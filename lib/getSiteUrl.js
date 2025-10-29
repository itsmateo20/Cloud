// lib/getSiteUrl.js

"use server";

import { headers } from "next/headers";

export async function getSiteUrl() {
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.VERCEL_URL;
    if (envUrl) {
        const hasScheme = /^(http|https):\/\//i.test(envUrl);
        return hasScheme ? envUrl : `https://${envUrl}`;
    }

    try {
        const h = await headers();
        if (h) {
            const xfProto = h.get("x-forwarded-proto");
            const xfHost = h.get("x-forwarded-host");
            const host = xfHost || h.get("host");
            const protocol = xfProto || (process.env.NODE_ENV === "production" ? "https" : "http");

            if (host) {
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
        }
    } catch { }

    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const port = process.env.PORT || (process.env.NODE_ENV === "production" ? "" : "3000");
    const host = port && port !== "" && port !== "80" && port !== "443" ? `localhost:${port}` : "localhost";
    return `${protocol}://${host}`;
}