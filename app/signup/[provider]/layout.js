// app/signup/google/layout.js
import "@/public/styles/globals.css";

import { AuthProvider } from "@/context/AuthProvider";
import { getSiteUrl } from "@/lib/getSiteUrl";
import { withBasePath } from "@/lib/basePath";

export async function generateMetadata({ params }) {
    const siteUrl = await getSiteUrl();
    const { provider } = await params;
    const isValidProvider = ["google", "github"].includes(provider);
    const pageTitle = isValidProvider
        ? `Signup ${provider === "github" ? "Github" : "Google"} | Cloud Storage App`
        : "404 | Cloud Storage App";

    return {
        metadataBase: new URL(siteUrl),
        icons: {
            icon: withBasePath("/assets/logo/rounded-512x512.png"),
            apple: withBasePath("/assets/logo/rounded-512x512.png"),
            shortcut: withBasePath("/assets/logo/512x512.png"),
        },
        title: pageTitle,
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
            title: pageTitle,
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
            title: pageTitle,
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
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "cyan" },
        { media: "(prefers-color-scheme: dark)", color: "black" },
    ],
}

export default function Layout({ children }) {
    return (
        <AuthProvider locked={false}>
            {children}
        </AuthProvider>
    );
}
