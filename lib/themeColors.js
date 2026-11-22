export const validThemes = ["light", "dark", "high-contrast", "device"];

export function getThemeColors(theme, prefersDark = true) {
    if (theme === "light") {
        return { themeColor: "#f1f1f1", backgroundColor: "#ffffff" };
    }

    if (theme === "high-contrast") {
        return { themeColor: "#000000", backgroundColor: "#000000" };
    }

    if (theme === "dark" || prefersDark) {
        return { themeColor: "#141414", backgroundColor: "#161616" };
    }

    return { themeColor: "#f1f1f1", backgroundColor: "#ffffff" };
}
