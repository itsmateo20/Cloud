// app/layout.js

import fonts from "@/app/fonts";
import "@/public/styles/globals.css";

import { AuthProvider } from "@/context/AuthProvider";
import { ToastProvider } from "@/components/app/ToastProvider";
import { getSiteUrl } from "@/lib/getSiteUrl";
import { DownloadManager } from "@/components/app/DownloadManager";

export async function generateMetadata() {
  const siteUrl = await getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
        'max-video-preview': -1,
        'max-image-preview': 'none',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: "/assets/logo/rounded-512x512.png",
      apple: "/assets/logo/rounded-512x512.png",
      shortcut: "/assets/logo/512x512.png",
    },
    title: "Home | Cloud Storage App",
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
      title: "Home | Cloud Storage App",
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
      title: "Home | Cloud Storage App",
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={fonts.join(' ')}>
      <body>
        <ToastProvider>
          <AuthProvider>
            {children}
            <DownloadManager />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
