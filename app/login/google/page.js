// app/login/google/page.js
"use client";

import style from "@/public/styles/googleAuth.module.css";

import { useAuth } from "@/context/AuthProvider";
import { api } from "@/utils/api";

import { use, useEffect, useState } from "react";
import { redirect } from "next/navigation";
import Image from "next/image";

import Layout from "@/components/Layout";
import SoftLoading from "@/components/SoftLoading";

import { getError } from "@/public/error/errors";

export default function Page({ searchParams }) {
    const { loading, softLoading, user, linkAccount } = useAuth();

    const { email, signature } = use(searchParams) || {};
    const [emailLink, setEmail] = useState(email);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (email && signature) {
            api.post("/api/auth/validate", { email, signature })
                .then(data => {
                    if (!data.success) {
                        console.error(data.error);
                        console.log("invalid-signature-redirect");
                        return redirect("/login");
                    }
                }).catch(err => {
                    console.error(err);
                    console.log("invalid-signature-redirect");
                    return redirect("/login");
                });
        }
    }, [email, signature]);

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

        const response = await linkAccount(email, emailLink, password, "google");
        const errorMsg = await getError(response.code, { detailed: false, lang: "en" });
        setError(errorMsg.message);
    };

    const toggleVisibility = () => {
        setIsVisible(prev => !prev);
    }

    return (
        <Layout mainStyle={style.main} loading={loading} user={user}>
            <h1 className={style.title}>Google Login Issue</h1>
            <h2 className={style.subtitle}>The Google account you're trying to use isn't linked to any registered account. Please enter your credentials to link it.</h2>
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

            <button onClick={handleLogin} type="button" className={style.loginButton} disabled={softLoading}>{softLoading ? <SoftLoading /> : "Link Account"}</button>

            {error && <p className="error">{error}</p>}
        </Layout>
    )
}
