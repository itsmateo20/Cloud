// app/signup/google/layout.js


import "@/public/styles/globals.css";

import { AuthProvider } from "@/context/AuthProvider";

export async function generateMetadata() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    return {
        metadataBase: new URL(siteUrl),
        icons: {
            icon: "/assets/logo/rounded-512x512.png",
            apple: "/assets/logo/rounded-512x512.png",
            shortcut: "/assets/logo/512x512.png",
        },
        title: "Sign Up Google | Cloud",
        description: "The Cloud Storage App is a web-based application designed for users to store and manage their files and folders in the cloud. It offers a convenient way to organize, upload, download, and delete files and folders, making it easy to access your data from anywhere.",
        keywords: "cloud, storage, cloudstorage",
        authors: [{ name: "itsmateo20" }],
        openGraph: {
            title: "Sign Up Google | Cloud",
            description: "The Cloud Storage App is a web-based application designed for users to store and manage their files and folders in the cloud. It offers a convenient way to organize, upload, download, and delete files and folders, making it easy to access your data from anywhere.",
            url: siteUrl,
            siteName: siteUrl.replace(/^https?:\/\//, ""),
            images: [
                {
                    url: `${siteUrl}/assets/logo/thumbnail.png`,
                },
            ],
            locale: "en_US",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: "Sign Up Google | Cloud",
            description: "The Cloud Storage App is a web-based application designed for users to store and manage their files and folders in the cloud. It offers a convenient way to organize, upload, download, and delete files and folders, making it easy to access your data from anywhere.",
            images: [`${siteUrl}/assets/logo/thumbnail.png`],
        }
    }
};

export const viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: 'cyan' },
        { media: '(prefers-color-scheme: dark)', color: 'black' },
    ],
}

export default function Layout({ children }) {
    return (
        <AuthProvider locked={false}>
            {children}
        </AuthProvider>
    );
}
