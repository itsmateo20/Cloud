// components/authentication/ThirdPartyAuthPage.js

"use client";

import style from "@/public/styles/ThirdPartyAuthError.module.css";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/utils/api";
import { withBasePath } from "@/lib/basePath";
import { use, useEffect, useState } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import Layout from "@/components/Layout";
import SoftLoading from "@/components/SoftLoading";
import { useIsMobile } from "@/utils/useIsMobile";
import { X, Check } from "lucide-react";
import { getError } from "@/public/error/errors";

export default function ThirdPartyAuthPage({ provider, mode, searchParams }) {
    const { loading, softLoading, user, linkAccount, signupwiththirdparty } = useAuth();
    const isMobile = useIsMobile();
    const { email, signature } = use(searchParams) || {};
    const [emailLink, setEmailLink] = useState(email || "");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState("");
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (email && signature) {
            api.post("/api/auth/validate", { email, signature }).then((data) => {
                if (!data.success) redirect(mode === "login" ? "/login" : "/signup");
            }).catch(() => redirect(mode === "login" ? "/login" : "/signup"));
        }
    }, [email, signature, mode]);

    const requirements = {
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
        minLength: password.length >= 8,
        matching: password === repeatPassword && password.length > 0
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        if (mode === "login") {
            const response = await linkAccount(email, emailLink, password, provider);
            setError((await getError(response.code, { detailed: false, lang: "en" })).message);
            return;
        }

        if (!signature || !Object.values(requirements).every(Boolean)) {
            const code = !signature ? "email_signature_missing" : "password_requirements_false";
            setError((await getError(code, { detailed: false, lang: "en" })).message);
            return;
        }

        const response = await signupwiththirdparty(email, password, provider, signature);
        if (!response.success) setError((await getError(response.code || "unknown_error", { detailed: false, lang: "en" })).message);
    };

    const title = provider[0].toUpperCase() + provider.slice(1);
    const isLogin = mode === "login";

    return (
        <Layout mainStyle={style.main} loading={loading} user={user} showNavigation={isMobile === false}>
            <h1 className={style.title}>{title} {isLogin ? "Login Issue" : "Signup"}</h1>
            <h2 className={style.subtitle}>{isLogin ? `The ${title} account is not linked to a registered account. Enter your credentials to link it.` : `Create a password for your ${title} account.`}</h2>
            <form onSubmit={handleSubmit}>
                <fieldset className={style.inputWithText}>
                    <legend>Email</legend>
                    <input type="email" value={isLogin ? emailLink : email || ""} disabled={isLogin === false} onChange={(event) => setEmailLink(event.target.value)} required />
                </fieldset>
                <fieldset className={style.inputWithText}>
                    <legend>Password</legend>
                    <input type={isVisible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength="8" />
                    <button type="button" onClick={() => setIsVisible((value) => !value)} aria-label="Toggle Password Visibility">
                        <Image src={withBasePath(isVisible ? "/assets/authentication/VisibilityOn.svg" : "/assets/authentication/VisibilityOff.svg")} width={30} height={30} alt="Visibility" />
                    </button>
                </fieldset>
                {!isLogin && <>
                    <fieldset className={style.inputWithText}>
                        <legend>Repeat Password</legend>
                        <input type={isVisible ? "text" : "password"} value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} required minLength="8" />
                    </fieldset>
                    <div className={style.passwordRequirements}>
                        {[["uppercase", "Uppercase letter"], ["lowercase", "Lowercase letter"], ["number", "Number"], ["special", "Special character"], ["minLength", "8 characters"], ["matching", "Match passwords"]].map(([key, label]) => <h1 key={key}>{requirements[key] ? <Check size={20} /> : <X size={20} />} {label}</h1>)}
                    </div>
                </>}
                <button type="submit" className={style.loginButton} disabled={softLoading}>{softLoading ? <SoftLoading /> : isLogin ? "Link Account" : "Sign Up"}</button>
            </form>
            {error && <p className="error">{error}</p>}
        </Layout>
    );
}
