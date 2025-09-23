// lib/qrCleanup.js

export async function cleanupExpiredQRTokens() {
    try {
        const result = await prisma.qrToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });

        return result.count;
    } catch (error) { return 0; }
}
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupExpiredQRTokens, 60 * 60 * 1000);
}
