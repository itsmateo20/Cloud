// app/not-found.js

import error from "@/public/styles/error.module.css";

import Link from "next/link"

import { getSiteUrl } from "@/lib/getSiteUrl";

export async function generateMetadata() {
    const siteUrl = await getSiteUrl();

    return {
        metadataBase: new URL(siteUrl),
        icons: {
            icon: "/assets/logo/rounded-512x512.png",
            apple: "/assets/logo/rounded-512x512.png",
            shortcut: "/assets/logo/512x512.png",
        },
        title: "404 | Cloud Storage App",
        description: "The Cloud Storage App is a web-based application designed for users to store and manage their files and folders in the cloud. It offers a convenient way to organize, upload, download, and delete files and folders, making it easy to access your data from anywhere.",
        keywords: "cloud, storage, cloudstorage, file management, online storage, secure storage",
        authors: [{ name: "itsmateo20" }],
        creator: "itsmateo20",
        publisher: "itsmateo20",
        category: "Technology",
        alternates: {
            canonical: siteUrl,
        },
        openGraph: {
            title: "404 | Cloud Storage App",
            description: "The Cloud Storage App is a web-based application designed for users to store and manage their files and folders in the cloud.",
            url: siteUrl,
            siteName: "Cloud Storage App",
            images: [
                {
                    url: `${siteUrl}/assets/logo/thumbnail.png`,
                    width: 1200,
                    height: 630,
                    alt: "Cloud Storage App - Secure File Management",
                    type: "image/png",
                },
            ],
            locale: "en_US",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: "404 | Cloud Storage App",
            description: "The Cloud Storage App is a web-based application designed for users to store and manage their files and folders in the cloud.",
            creator: "@itsmateo20",
            site: "@itsmateo20",
            images: [
                {
                    url: `${siteUrl}/assets/logo/thumbnail.png`,
                    alt: "Cloud Storage App - Secure File Management",
                }
            ],
        },
    };
}

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#f1f1f1" },
        { media: "(prefers-color-scheme: dark)", color: "#141414" },
    ],
};

export default function NotFound() {
    return (
        <main className={error.fourofour}>
            <h1>Page not found.</h1>
            <Link href="/">Redirect back to home page</Link>
        </main>
    )
}
