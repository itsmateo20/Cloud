// app/robots.js

import { getSiteUrl } from "@/lib/getSiteUrl";

export default async function robots() {
    const siteURL = await getSiteUrl();

    return {
        rules: {
            userAgent: "*",
            disallow: "/",
        },
    }
}