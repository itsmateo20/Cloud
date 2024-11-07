"use client";

import { useAuth } from '@/context/AuthProvider';
import Layout from '@/components/Layout';
import loginStyle from "@/public/styles/login.module.css";

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { GoogleSignIn } from '@/components/authentication/GoogleSignIn';

export default function Page() {
    const { user, login, loading } = useAuth();

    const [isMobile, setIsMobile] = useState(null);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [passwordType, setPasswordType] = useState('password');
    const [email, setEmail] = useState('');
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

    const showPassword = () => {
        if (passwordType === 'password') {
            setPasswordType('text');
            setPasswordVisible(true);
        } else {
            setPasswordType('password');
            setPasswordVisible(false);
        }
    };

    const handleLogin = async () => {
        console.log("Logging in with", email, password);
        setError('');

        try {
            await login(email, password);
        } catch (err) {
            setError(err.message);
        }
    };

    if (user) return redirect('/');

    return (
        <Layout loading={false} mobile={isMobile} user={user}>
            <main className={loginStyle.main}>
                <h1 className={loginStyle.title}>Login</h1>
                <h2 className={loginStyle.subtitle}>Login into your cloud storage account</h2>
                <fieldset className={loginStyle.inputWithText}>
                    <legend>Email</legend>
                    <input
                        type="email"
                        name="email"
                        defaultValue={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </fieldset>

                <fieldset className={loginStyle.inputWithText}>
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
                        />
                    </button>
                </fieldset>

                <GoogleSignIn style={loginStyle} />

                <button onClick={handleLogin} type="button" className={loginStyle.loginButton}>Log In</button>

                {error && <p className={loginStyle.error}>{error}</p>}

                <Link href="/register" className={loginStyle.registerLink}>
                    Don't have an account yet? Sign Up
                </Link>
            </main>
        </Layout>
    );
}
