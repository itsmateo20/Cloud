// app/robots.js

export default async function robots() {
    return {
        rules: {
            userAgent: "*",
            disallow: "/",
        },
    }
}