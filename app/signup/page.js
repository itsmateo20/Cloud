// app/signup/page.js
"use client";

import { useAuth } from '@/context/AuthProvider';
import Layout from '@/components/Layout';
import signupStyle from "@/public/styles/signup.module.css";

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { GoogleSignIn } from '@/components/authentication/GoogleSignIn';

export default function Page() {
    const { loading, user, signup, clearDatabase } = useAuth();

    const [isMobile, setIsMobile] = useState(null);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [repeatPasswordVisible, setRepeatPasswordVisible] = useState(false);
    const [passwordType, setPasswordType] = useState('password');
    const [repeatPasswordType, setRepeatPasswordType] = useState('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
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

    const showRepeatPassword = () => {
        if (repeatPasswordType === 'password') {
            setRepeatPasswordType('text');
            setRepeatPasswordVisible(true);
        } else {
            setRepeatPasswordType('password');
            setRepeatPasswordVisible(false);
        }
    };

    const handleSignup = async () => {
        if (password !== repeatPassword) {
            setError('Passwords do not match');
            console.log("Passwords do not match");
            return;
        }
        setError('');

        try {
            await signup(email, password);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Layout loading={loading} mobile={isMobile} user={user}>
            <main className={signupStyle.main}>
                <h1 className={signupStyle.title}>Signup</h1>
                <h2 className={signupStyle.subtitle}>Make an account for your cloud storage</h2>
                <fieldset className={signupStyle.inputWithText}>
                    <legend>Email</legend>
                    <input
                        type="email"
                        name="email"
                        defaultValue={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required />
                </fieldset>
                <fieldset className={signupStyle.inputWithText}>
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
                <fieldset className={signupStyle.inputWithText}>
                    <legend>Repeat Password</legend>
                    <input
                        type={repeatPasswordType}
                        name='password'
                        defaultValue={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        required
                        minLength="8"
                    />
                    <button
                        type="button"
                        onClick={showRepeatPassword}
                        aria-label="Toggle Repeat Password Visibility"
                    >
                        <Image
                            src={repeatPasswordVisible ? "/assets/authentication/VisibilityOn.svg" : "/assets/authentication/VisibilityOff.svg"}
                            width={30}
                            height={30}
                            alt="Visibility"
                        />
                    </button>
                </fieldset>
                <GoogleSignIn style={signupStyle} />
                <button onClick={handleSignup} type="button" className={signupStyle.signupButton}>Sign Up</button>
                <button type="button" onClick={() => clearDatabase()}><span>clear</span></button>
                <Link href="/login" className={signupStyle.signupLink}>Already have an account? Log In</Link>
            </main>
        </Layout>
    )
}
