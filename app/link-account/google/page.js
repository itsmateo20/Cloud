// app/link-account/page.js
"use client";

import { useAuth } from '@/context/AuthProvider';
import Layout from '@/components/Layout';
import linkAccountStyle from "@/public/styles/link-account.module.css";
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getError } from '@/public/error/errors';

export default function Page({ searchParams }) {
    const { user, linkAccount, loading } = useAuth();

    const [isMobile, setIsMobile] = useState(null);
    const { email, signature } = use(searchParams) || {};
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

    const handleLinkAccount = async () => {
        setError('');


        const response = await linkAccount(email, email, password, "google");
        const errorMsg = await getError(response.code, { detailed: false, lang: "en" });
        setError(errorMsg.message);
    };

    return (
        <Layout loading={loading} mobile={isMobile} user={user}>
            <main className={linkAccountStyle.main}>
                <h1 className={linkAccountStyle.title}>Google Login Issue</h1>
                <h2 className={linkAccountStyle.subtitle}>An account with this Google email already exists. Please log in to link it.</h2>

                <fieldset className={`${linkAccountStyle.inputWithText} ${linkAccountStyle.disabled}`}>
                    <legend>Email</legend>
                    <h1>{email}</h1>
                </fieldset>

                <fieldset className={linkAccountStyle.inputWithText}>
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

                <button onClick={handleLinkAccount} type="button" className={linkAccountStyle.linkAccountButton}>Link Account</button>

                {error && <p className={linkAccountStyle.error}>{error}</p>}

                <Link href="/login" className={linkAccountStyle.loginLink}>
                    Not your account? Log In
                </Link>
            </main>
        </Layout >
    );
}