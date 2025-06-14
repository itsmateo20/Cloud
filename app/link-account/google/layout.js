// app/connect-account/layout.js


import "@/public/styles/globals.css";

import { AuthProvider } from "@/context/AuthProvider";

export async function generateMetadata() {
    return {
        metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL),
        icons: {
            icon: "/assets/logo/rounded-512x512.png",
            apple: "/assets/logo/rounded-512x512.png",
            shortcut: "/assets/logo/512x512.png",
        },
        assets: ["/assets"],
        canonical: `/`,
        title: "Connect account | Cloud",
        description: "The Cloud Storage App is a web-based application designed for users to store and manage their files and folders in the cloud. It offers a convenient way to organize, upload, download, and delete files and folders, making it easy to access your data from anywhere.",
        author: "itsmateo20",
        keywords: "cloud, storage, cloudstorage",
        openGraph: {
            title: "Connect account | Cloud",
            description: "The Cloud Storage App is a web-based application designed for users to store and manage their files and folders in the cloud. It offers a convenient way to organize, upload, download, and delete files and folders, making it easy to access your data from anywhere.",
            url: `${process.env.NEXT_PUBLIC_SITE_URL}`,
            siteName: `${process.env.NEXT_PUBLIC_SITE_URL.replace("https://", "").replace("http://", "")}`,
            images: [
                {
                    url: `${process.env.NEXT_PUBLIC_SITE_URL}/assets/logo/thumbnail.png`,
                },
            ],
            locale: "en_US",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: "Connect account | Cloud",
            description: "The Cloud Storage App is a web-based application designed for users to store and manage their files and folders in the cloud. It offers a convenient way to organize, upload, download, and delete files and folders, making it easy to access your data from anywhere.",
            images: [`${process.env.NEXT_PUBLIC_SITE_URL}/assets/logo/thumbnail.png`],
        }
    }
};

export default function Layout({ children }) {
    return (
        <AuthProvider locked={false}>
            {children}
        </AuthProvider>
    );
}