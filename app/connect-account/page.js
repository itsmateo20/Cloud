// app/connect-account/page.js
"use client";

import { useAuth } from '@/context/AuthProvider';
import Layout from '@/components/Layout';
import connectAccountStyle from "@/public/styles/connect-account.module.css";
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';

export default function Page({ searchParams }) {
    const { user, connectAccount, loading } = useAuth();

    const [isMobile, setIsMobile] = useState(null);
    const { email, signature, type } = use(searchParams) || {};
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [passwordType, setPasswordType] = useState('password');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');


    useEffect(() => {
        if (typeof window !== 'undefined') {
            const mobile = window.matchMedia("(max-width: 1023px)");
            setIsMobile(mobile.matches);

            const handleResize = () => setIsMobile(window.matchMedia("(max-width: 1023px)").matches);
            window.addEventListener('resize', handleResize);

            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    useEffect(() => {
        if (email && signature) {
            fetch('/api/auth/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, signature }),
            })
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        console.error(data.error);
                        console.log("invalid-signature-redirect")
                        return redirect("/login");
                    }
                })
                .catch(error => {
                    console.error(error);
                    console.log("invalid-signature-redirect")
                    return redirect("/login");
                });
        }
    }, [email, signature]);

    const showPassword = () => {
        if (passwordType === 'password') {
            setPasswordType('text');
            setPasswordVisible(true);
        } else {
            setPasswordType('password');
            setPasswordVisible(false);
        }
    };

    const handleConnectAccount = async () => {
        setError('');

        try {
            await connectAccount(email, password, type);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Layout loading={loading} mobile={isMobile} user={user}>
            <main className={connectAccountStyle.main}>
                <h1 className={connectAccountStyle.title}>Connect Account</h1>
                <h2 className={connectAccountStyle.subtitle}>An account with this email already exists. Please log in to connect it.</h2>

                <fieldset className={`${connectAccountStyle.inputWithText} ${connectAccountStyle.disabled}`}>
                    <legend>Email</legend>
                    <h1>{email}</h1>
                </fieldset>

                <fieldset className={connectAccountStyle.inputWithText}>
                    <legend>Password</legend>
                    <input
                        type={passwordType}
                        name="password"
                        defaultValue={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength="8"
                    />
                    <button
                        type="button"
                        onClick={showPassword}
                        aria-label="Toggle Password Visibility"
                    >
                        <Image
                            src={passwordVisible ? "/assets/authentication/VisibilityOn.svg" : "/assets/authentication/VisibilityOff.svg"}
                            width={30}
                            height={30}
                            alt="Visibility"
                            loading='eager'
                            quality={100}
                        />
                    </button>
                </fieldset>

                <button onClick={handleConnectAccount} type="button" className={connectAccountStyle.connectAccountButton}>Connect Account</button>

                {error && <p className={connectAccountStyle.error}>{error}</p>}

                <Link href="/login" className={connectAccountStyle.loginLink}>
                    Not your account? Log In
                </Link>
            </main>
        </Layout >
    );
}