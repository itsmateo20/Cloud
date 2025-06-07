// app/signup/google/page.js
"use client";

import { useAuth } from '@/context/AuthProvider';
import Layout from '@/components/Layout';
import googleSignupStyle from "@/public/styles/googleAuth.module.css";

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getError } from '@/public/error/errors';

export default function Page({ searchParams }) {
    const { loading, user, linkAccount } = useAuth();

    const [isMobile, setIsMobile] = useState(null);
    const { email, signature } = use(searchParams) || {};
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [passwordType, setPasswordType] = useState('password');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            let mobile = window.matchMedia("(max-width: 1023px)");
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
                        return redirect("/signup");
                    }
                })
                .catch(error => {
                    console.error(error);
                    console.log("invalid-signature-redirect")
                    return redirect("/signup");
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

    const handleSignup = async () => {
        setError('');

        // const response = await linkAccount(email, emailLink, password, "google");
        // const errorMsg = await getError(response.code, { detailed: false, lang: "en" });
        // setError(errorMsg.message);
    };

    return (
        <Layout loading={loading} mobile={isMobile} user={user}>
            <main className={googleSignupStyle.main}>
                <h1 className={googleSignupStyle.title}>Google Signup</h1>
                <h2 className={googleSignupStyle.subtitle}>Create a password for your account.</h2>
                <fieldset className={googleSignupStyle.inputWithText}>
                    <legend>Email</legend>
                    <input
                        type="email"
                        name="email"
                        value={email}
                        disabled
                    />
                </fieldset>

                <fieldset className={googleSignupStyle.inputWithText}>
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

                <button onClick={handleSignup} type="button" className={googleSignupStyle.loginButton}>Sign up</button>

                {error && <p className={googleSignupStyle.error}>{error}</p>}
            </main>
        </Layout>
    )
}
