// lib/qrCleanup.js

import { prisma } from '@/lib/db';

export async function cleanupExpiredQRTokens() {
    try {
        const result = await prisma.qrToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });

        console.log(`Cleaned up ${result.count} expired QR tokens`);
        return result.count;
    } catch (error) {
        console.error('Error cleaning up expired QR tokens:', error);
        return 0;
    }
}

// Auto-cleanup every hour
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupExpiredQRTokens, 60 * 60 * 1000); // 1 hour
}
