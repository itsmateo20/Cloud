// app/qr/[token]/page.js

import QRHandler from '@/components/qr/QRHandler';
import styles from '@/components/qr/QRHandler.module.css';
import { findQrTokenByToken, deleteQrTokenById } from '@/lib/qrTokens';

export default async function page({ params }) {
    const { token } = await params;

    try {
        const qrToken = await findQrTokenByToken(token);

        if (!qrToken) {
            return (
                <div className={styles.errorContainer}>
                    <div className={styles.errorCard}>
                        <h1 className={styles.errorTitle}>Invalid QR Code</h1>
                        <p className={styles.errorMessage}>This QR code is invalid or has been removed.</p>
                    </div>
                </div>
            );
        }

        if (!qrToken.expiresAt || new Date() > qrToken.expiresAt) {
            await deleteQrTokenById(qrToken.id);

            return (
                <div className={styles.errorContainer}>
                    <div className={styles.errorCard}>
                        <h1 className={styles.errorTitle}>QR Code Expired</h1>
                        <p className={styles.errorMessage}>This QR code has expired. Please generate a new one.</p>
                    </div>
                </div>
            );
        }

        const data = JSON.parse(qrToken.data);

        return <QRHandler token={token} type={qrToken.type} data={data} />;

    } catch (error) {

        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorCard}>
                    <h1 className={styles.errorTitle}>Error</h1>
                    <p className={styles.errorMessage}>An error occurred while processing the QR code.</p>
                </div>
            </div>
        );
    }
}
