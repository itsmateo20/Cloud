// app/login/google/page.js
"use client";

import { useAuth } from "@/context/AuthProvider";
import Layout from "@/components/Layout";
import googleLoginStyle from "@/public/styles/googleAuth.module.css";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getError } from "@/public/error/errors";

import SoftLoading from "@/components/SoftLoading";

export default function Page({ searchParams }) {
    const { loading, softLoading, user, linkAccount } = useAuth();

    const [isMobile, setIsMobile] = useState(null);
    const { email, signature } = use(searchParams) || {};
    const [emailLink, setEmail] = useState(email);
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
        if (email && signature) {
            fetch("/api/auth/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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

        const response = await linkAccount(email, emailLink, password, "google");
        const errorMsg = await getError(response.code, { detailed: false, lang: "en" });
        setError(errorMsg.message);
    };

    const toggleVisibility = () => {
        setIsVisible(prev => !prev);
    }

    return (
        <Layout mainStyle={googleLoginStyle.main} loading={loading} mobile={isMobile} user={user}>
            <h1 className={googleLoginStyle.title}>Google Login Issue</h1>
            <h2 className={googleLoginStyle.subtitle}>The Google account you're trying to use isn't linked to any registered account. Please enter your credentials to link it.</h2>
            <fieldset className={googleLoginStyle.inputWithText}>
                <legend>Email</legend>
                <input
                    type="email"
                    name="email"
                    defaultValue={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </fieldset>

            <fieldset className={googleLoginStyle.inputWithText}>
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
                    aria-label="Toggle Password Visibility"
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

            <button onClick={handleLogin} type="button" className={googleLoginStyle.loginButton} disabled={softLoading}>{softLoading ? <SoftLoading /> : "Link Account"}</button>

            {error && <p className="error">{error}</p>}
        </Layout>
    )
}
