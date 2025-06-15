// app/login/page.js
"use client";

import { useAuth } from "@/context/AuthProvider";
import Layout from "@/components/Layout";
import loginStyle from "@/public/styles/login.module.css";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { GoogleAuth } from "@/components/authentication/GoogleAuth";
import { getError } from "@/public/error/errors";
import SoftLoading from "@/components/SoftLoading";

export default function Page() {
    const { loading, softLoading, user, login, authWithGoogle, clearDatabase } = useAuth();

    const [isMobile, setIsMobile] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            let mobile = window.matchMedia("(max-width: 1023px)");
            setIsMobile(mobile.matches);

            const handleResize = () => setIsMobile(window.matchMedia("(max-width: 1023px)").matches);
            window.addEventListener("resize", handleResize);

            return () => window.removeEventListener("resize", handleResize);
        }
    }, []);

    useEffect(() => {
        if (error) {
            const errorElement = document.querySelector('.error');
            if (errorElement) {
                errorElement.style.top = '-8%';
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
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            minLength: password.length >= 8,
        });
    }, [password]);

    return (
        <Layout loading={loading} mobile={isMobile} user={user}>
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

                <button onClick={handleLogin} type="button" className={loginStyle.loginButton} disabled={softLoading}>{softLoading ? <SoftLoading /> : "Log In"}</button>
                <Link href="/signup" className={loginStyle.signupLink}>Don't have an account yet? Sign Up</Link>

                <button type="button" onClick={() => clearDatabase()}><span>clear</span></button>

                {error && <p className="error">{error}</p>}
            </main>
        </Layout>
    )
}
