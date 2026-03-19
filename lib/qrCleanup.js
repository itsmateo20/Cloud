// lib/qrCleanup.js

import { deleteExpiredQrTokens } from "@/lib/qrTokens";

export async function cleanupExpiredQRTokens() {
    try {
        return await deleteExpiredQrTokens();
    } catch (error) { return 0; }
}
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupExpiredQRTokens, 60 * 60 * 1000);
}
