// app/unauthorized.js
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Unauthorized() {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.push('/login');
        }, 3000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--background)',
            color: 'var(--text)',
            fontFamily: 'var(--font-rubik)',
            padding: '20px',
            textAlign: 'center'
        }}>
            <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>401</h1>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Unauthorized</h2>
            <p style={{ color: 'var(--text-color-muted)', marginBottom: '24px' }}>
                You don't have permission to access this resource.
            </p>
            <p style={{ color: 'var(--text-color-muted)' }}>
                Redirecting to login page...
            </p>
        </div>
    );
}
