// lib/getSiteUrl.js

"use server";

import { headers } from "next/headers";

// Resolve the public-facing site URL in all environments (dev/prod, with/without proxy).
// Strategy (priority order):
// 1) NEXT_PUBLIC_SITE_URL or SITE_URL env, if set (must be absolute URL)
// 2) Request headers (x-forwarded-host/proto, host) if available
// 3) Fallback to localhost with appropriate protocol and port
export async function getSiteUrl() {
    // 1) Explicit env vars take precedence
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.VERCEL_URL;
    if (envUrl) {
        // Ensure scheme; if VERCEL_URL is bare host, add https
        const hasScheme = /^(http|https):\/\//i.test(envUrl);
        return hasScheme ? envUrl : `https://${envUrl}`;
    }

    // 2) Try to read from request headers when available
    try {
        const h = await headers();
        if (h) {
            const xfProto = h.get("x-forwarded-proto");
            const xfHost = h.get("x-forwarded-host");
            const host = xfHost || h.get("host");
            const protocol = xfProto || (process.env.NODE_ENV === "production" ? "https" : "http");

            if (host) {
                // In dev, if host is a private IP, normalize to localhost to avoid mixed envs
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
    } catch {
        // headers() can throw when called outside request context (e.g., some runtimes / build tooling)
    }

    // 3) Safe fallback
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const port = process.env.PORT || (process.env.NODE_ENV === "production" ? "" : "3000");
    const host = port && port !== "" && port !== "80" && port !== "443" ? `localhost:${port}` : "localhost";
    return `${protocol}://${host}`;
}