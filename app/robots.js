// /robots.js

import { getSiteUrl } from "@/lib/getSiteUrl";

export default async function robots() {
    const siteURL = await getSiteUrl();

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/private/", "/admin/"],
        },
        sitemap: `${siteURL}/sitemap.xml`,
    }
}