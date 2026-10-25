// lib/basePath.js

const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH || "";

export function getBasePath() {
    if (!configuredBasePath || configuredBasePath === "/") return "";
    return `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`;
}

export function withBasePath(pathname) {
    if (!pathname) return `${getBasePath()}/`;
    if (pathname === "/") return `${getBasePath()}/`;
    if (/^[a-z][a-z\d+\-.]*:\/\//i.test(pathname)) return pathname;

    const basePath = getBasePath();
    if (!basePath || pathname === basePath || pathname.startsWith(`${basePath}/`)) {
        return pathname;
    }

    return `${basePath}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
