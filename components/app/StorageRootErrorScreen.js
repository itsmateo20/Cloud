"use client";

import { AlertTriangle, RefreshCw } from 'lucide-react';
import styles from './StorageRootErrorScreen.module.css';

export default function StorageRootErrorScreen({ error, onRetry }) {
    const title = error?.code === 'unauthorized'
        ? 'Session unavailable'
        : 'Upload folder unavailable';

    const description = error?.message || 'The storage folder configured in your .env file could not be loaded.';

    const handleRetry = () => {
        if (typeof onRetry === 'function') {
            onRetry();
            return;
        }

        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    return (
        <main className={styles.screen} role="alert" aria-live="assertive">
            <section className={styles.card}>
                <div className={styles.iconWrap}>
                    <AlertTriangle size={34} strokeWidth={2.2} />
                </div>

                <div className={styles.content}>
                    <p className={styles.kicker}>Storage check failed</p>
                    <h1>{title}</h1>
                    <p className={styles.description}>{description}</p>

                    <div className={styles.details}>
                        <h2>What to check</h2>
                        <ul>
                            <li>The <strong>UPLOAD_FOLDER</strong> value in your .env file</li>
                            <li>That the folder exists and the server can read and write to it</li>
                            <li>That the configured path is mounted correctly on this machine</li>
                        </ul>
                    </div>

                    {error?.code && (
                        <p className={styles.code}>Error code: {error.code}</p>
                    )}

                    <button className={styles.retryButton} onClick={handleRetry}>
                        <RefreshCw size={16} />
                        Reload app
                    </button>
                </div>
            </section>
        </main>
    );
}