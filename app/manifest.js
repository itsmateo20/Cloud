// app/manifest.js

import { cookies, headers } from "next/headers";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { withBasePath } from "@/lib/basePath";
import { getThemeColors, validThemes } from "@/lib/themeColors";

export const dynamic = "force-dynamic";

export default async function manifest() {
    const cookieStore = await cookies();
    const requestHeaders = await headers();
    const session = await getSession();
    const settings = session?.user?.id
        ? await prisma.userSettings.findUnique({
            where: { userId: session.user.id },
            select: { theme: true }
        })
        : null;
    const savedTheme = settings?.theme;
    const localTheme = cookieStore.get("cloud-theme")?.value;
    const theme = validThemes.includes(savedTheme)
        ? savedTheme
        : validThemes.includes(localTheme)
            ? localTheme
            : "device";
    const prefersDark = requestHeaders.get("sec-ch-prefers-color-scheme") !== "light";
    const { themeColor, backgroundColor } = getThemeColors(theme, prefersDark);

    return {
        name: "Cloud Storage",
        short_name: "Cloud",
        description: "The Cloud Storage App is a web-based application designed for users to store and manage their files and folders in the cloud. It offers a convenient way to organize, upload, download, and delete files and folders, making it easy to access your data from anywhere.",
        start_url: withBasePath("/"),
        display: "standalone",
        background_color: backgroundColor,
        theme_color: themeColor,
        icons: [
            {
                src: withBasePath("/assets/logo/rounded-192x192.png"),
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: withBasePath("/assets/logo/rounded-512x512.png"),
                sizes: "512x512",
                type: "image/png",
            },
        ],
    }
}