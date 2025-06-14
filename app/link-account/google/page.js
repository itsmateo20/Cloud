// app/link-account/page.js
"use client";

import { useAuth } from "@/context/AuthProvider";
import Layout from "@/components/Layout";
import linkAccountStyle from "@/public/styles/link-account.module.css";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getError } from "@/public/error/errors";

import { api } from "@/utils/api";

export default function Page({ searchParams }) {
    const { user, linkAccount, loading } = useAuth();

    const [isMobile, setIsMobile] = useState(null);
    const { email, signature } = use(searchParams) || {};
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const mobile = window.matchMedia("(max-width: 1023px)");
            setIsMobile(mobile.matches);

            const handleResize = () => setIsMobile(window.matchMedia("(max-width: 1023px)").matches);
            window.addEventListener("resize", handleResize);

            return () => window.removeEventListener("resize", handleResize);
        }
    }, []);

    useEffect(() => {
        if (email && signature) {
            api.post("/api/auth/validate", { email, signature })
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

    const handleLinkAccount = async () => {
        setError("");

        if (passwordRequirements.uppercase && passwordRequirements.lowercase && passwordRequirements.number && passwordRequirements.special && passwordRequirements.minLength) {
            const response = await linkAccount(email, email, password, "google");
            const errorMsg = await getError(response.code, { detailed: false, lang: "en" });
            setError(errorMsg.message);
        } else {
            const errorMsg = await getError("password_requirements_false", { detailed: false, lang: "en" });
            setError(errorMsg.message);
        }
    };

    const toggleVisibility = () => {
        setPassword(prev => !prev);
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
                            alt="Visibility"
                            loading="eager"
                        />
                    </button>
                </fieldset>

                <button onClick={handleLinkAccount} type="button" className={linkAccountStyle.linkAccountButton}>Link Account</button>

                {error && <p className="error">{error}</p>}

                <Link href="/login" className={linkAccountStyle.loginLink}>Not your account? Log In</Link>
            </main>
        </Layout >
    );
}