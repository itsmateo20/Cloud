"use client";

import { useEffect } from "react";
import { getThemeColors, validThemes } from "@/lib/themeColors";

export default function ThemeColorSync() {
    useEffect(() => {
        const root = document.documentElement;
        const colorSchemePreference = window.matchMedia("(prefers-color-scheme: dark)");

        const syncThemeColor = () => {
            const theme = root.getAttribute("data-theme") === "high-contrast"
                ? "high-contrast"
                : root.getAttribute("data-color-scheme") || "device";
            const colors = getThemeColors(theme, colorSchemePreference.matches);
            let meta = document.querySelector('meta[name="theme-color"]');

            if (!meta) {
                meta = document.createElement("meta");
                meta.name = "theme-color";
                document.head.appendChild(meta);
            }

            meta.content = colors.themeColor;
            meta.removeAttribute("media");

            if (validThemes.includes(theme)) {
                document.cookie = `cloud-theme=${theme}; Max-Age=31536000; Path=/; SameSite=Lax`;
            }
        };

        const observer = new MutationObserver(syncThemeColor);
        observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-color-scheme"] });
        colorSchemePreference.addEventListener("change", syncThemeColor);
        syncThemeColor();

        return () => {
            observer.disconnect();
            colorSchemePreference.removeEventListener("change", syncThemeColor);
        };
    }, []);

    return null;
}
