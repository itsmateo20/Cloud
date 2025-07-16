// app/login/page.js
"use client";

import style from "@/public/styles/login.module.css";

import { useAuth } from "@/context/AuthProvider";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Layout from "@/components/Layout";
import { GoogleAuth } from "@/components/authentication/GoogleAuth";
import SoftLoading from "@/components/SoftLoading";

import { getError } from "@/public/error/errors";

export default function Page() {
    const { loading, softLoading, user, login, authWithGoogle, clearDatabase } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (error) {
            const errorElement = document.querySelector(".error");
            if (errorElement) {
                errorElement.style.top = "-8%";
            }
            setTimeout(() => {
                setError("");
            }, 1500);
        }
    }, [email, password]);

    const handleLogin = async () => {
        setError("");

        if (passwordRequirements.uppercase && passwordRequirements.lowercase && passwordRequirements.number && passwordRequirements.special && passwordRequirements.minLength) {
            const response = await login(email, password);
            const errorMsg = await getError(response?.code, { detailed: false, lang: "en" });
            setError(errorMsg.message);
        } else {
            const errorMsg = await getError("password_requirements_false", { detailed: false, lang: "en" });
            setError(errorMsg.message);
        }
    };

    const toggleVisibility = () => {
        setIsVisible(prev => !prev);
    }

    const [passwordRequirements, setPasswordRequirements] = useState({
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
        minLength: false
    });

    useEffect(() => {
        setPasswordRequirements({
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};":"\\|,.<>\/?]/.test(password),
            minLength: password.length >= 8,
        });
    }, [password]);

    return (
        <Layout mainStyle={style.main} loading={loading} user={user}>
            <h1 className={style.title}>Login</h1>
            <h2 className={style.subtitle}>Login into your cloud storage account</h2>
            <fieldset className={style.inputWithText}>
                <legend>Email</legend>
                <input
                    type="email"
                    name="email"
                    defaultValue={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </fieldset>

            <fieldset className={style.inputWithText}>
                <legend>Password</legend>
                <input
                    name="password"
                    type={isVisible ? "text" : "password"}
                    defaultValue={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength="8"
                />
                <button
                    type="button"
                    onClick={toggleVisibility}
                >
                    <Image
                        src={
                            isVisible
                                ? "/assets/authentication/VisibilityOn.svg"
                                : "/assets/authentication/VisibilityOff.svg"
                        }
                        width={30}
                        height={30}
                        id="visibilityIcon"
                        alt="Visibility"
                        loading="eager"
                    />
                </button>
            </fieldset>

            <GoogleAuth auth={authWithGoogle} type="login" />

            <button onClick={handleLogin} type="button" className={style.loginButton} disabled={softLoading}>{softLoading ? <SoftLoading /> : "Log In"}</button>
            <Link href="/signup" className={style.signupLink}>Don't have an account yet? Sign Up</Link>

            <button type="button" onClick={() => clearDatabase()}><span>clear</span></button>

            {error && <p className="error">{error}</p>}
        </Layout>
    )
}
