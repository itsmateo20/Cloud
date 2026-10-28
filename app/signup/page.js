// app/signup/page.js
"use client";

import style from "@/public/styles/signup.module.css";

import { useAuth } from "@/context/AuthProvider";
import { api } from "@/utils/api";
import { withBasePath } from "@/lib/basePath";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Layout from "@/components/Layout";
import { GoogleAuth } from "@/components/authentication/GoogleAuth";
import { GithubAuth } from "@/components/authentication/GithubAuth";
import SoftLoading from "@/components/SoftLoading";
import { useIsMobile } from "@/utils/useIsMobile";

import { X, Check } from "lucide-react";

import { getError } from "@/public/error/errors";

export default function Page() {
    const { loading, softLoading, user, signup, authWithGoogle, authWithGithub } = useAuth();
    const isMobile = useIsMobile();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState("");
    const [signupEnabled, setSignupEnabled] = useState(true);
    const [isFirstAdmin, setIsFirstAdmin] = useState(false);
    const [authProviders, setAuthProviders] = useState({ google: true, github: true });

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setIsFirstAdmin(params.get("first") === "1");
        api.get("/api/auth/bootstrap-status").then((response) => {
            if (response?.success) {
                setSignupEnabled(response.signupEnabled || params.get("first") === "1");
                setAuthProviders({ google: response.googleAuthEnabled !== false, github: response.githubAuthEnabled !== false });
            }
        });
    }, []);

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
    }, [email, password, repeatPassword]);

    const handleSignup = async (event) => {
        event?.preventDefault();
        if (password !== repeatPassword) {
            setError("Passwords do not match");
        } else {
            setError("");
            if (passwordRequirements.uppercase && passwordRequirements.lowercase && passwordRequirements.number && passwordRequirements.special && passwordRequirements.minLength && passwordRequirements.matching) {
                const response = await signup(email, password);
                const errorMsg = await getError(response?.code, { detailed: false, lang: "en" });
                setError(errorMsg.message);
            } else {
                const errorMsg = await getError("password_requirements_false", { detailed: false, lang: "en" });
                setError(errorMsg.message);
            }
        }
    };

    const toggleVisibility = () => {
        setIsVisible(prev => !prev);
    };

    const [passwordRequirements, setPasswordRequirements] = useState({
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
        minLength: false,
        matching: false
    });

    useEffect(() => {
        setPasswordRequirements({
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};":"\\|,.<>\/?]/.test(password),
            minLength: password.length >= 8,
            matching: password === repeatPassword && password.length > 0
        });
    }, [password, repeatPassword]);

    return (
        <Layout mainStyle={style.main} loading={loading} user={user} showNavigation={isMobile === false}>
            <h1 className={style.title}>{isFirstAdmin ? "Create Admin Account" : "Signup"}</h1>
            <h2 className={style.subtitle}>{isFirstAdmin ? "Set up the first administrator account for Cloud" : "Make an account for your cloud storage"}</h2>
            {!signupEnabled && <p className="error">Sign up has been disabled by an administrator.</p>}
            {signupEnabled && <>
                <form onSubmit={handleSignup}>
                    <fieldset className={style.inputWithText}>
                        <legend>Email</legend>
                        <input
                            type="email"
                            name="email"
                            defaultValue={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required />
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
                                        ? withBasePath("/assets/authentication/VisibilityOn.svg")
                                        : withBasePath("/assets/authentication/VisibilityOff.svg")
                                }
                                id="visibilityIcon"
                                width={30}
                                height={30}
                                alt="Visibility"
                            />
                        </button>
                    </fieldset>

                    <fieldset className={style.inputWithText}>
                        <legend>Repeat Password</legend>
                        <input
                            name="repeatPassword"
                            type={isVisible ? "text" : "password"}
                            value={repeatPassword}
                            onChange={(e) => setRepeatPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                        <button
                            type="button"
                            onClick={toggleVisibility}
                            aria-label="Toggle Repeat Password Visibility"
                        >
                            <Image
                                src={
                                    isVisible
                                        ? withBasePath("/assets/authentication/VisibilityOn.svg")
                                        : withBasePath("/assets/authentication/VisibilityOff.svg")
                                }
                                width={30}
                                height={30}
                                alt="Visibility"
                                loading="eager"
                            />
                        </button>
                    </fieldset>

                    <div className={style.passwordRequirements}>
                        <h1>{passwordRequirements.uppercase ? <Check size={20} /> : <X size={20} />} Uppercase letter</h1>
                        <h1>{passwordRequirements.lowercase ? <Check size={20} /> : <X size={20} />} Lowercase letter</h1>
                        <h1>{passwordRequirements.number ? <Check size={20} /> : <X size={20} />} Number</h1>
                        <h1>{passwordRequirements.special ? <Check size={20} /> : <X size={20} />} Special character</h1>
                        <h1>{passwordRequirements.minLength ? <Check size={20} /> : <X size={20} />} 8 characters</h1>
                        <h1>{passwordRequirements.matching ? <Check size={20} /> : <X size={20} />} Match passwords</h1>
                    </div>

                    {authProviders.google || authProviders.github ? (
                        <>
                            <h2 className={style.or}>or</h2>
                            <div className={style.thirdPartyAuth}>
                                <GoogleAuth auth={authWithGoogle} type="signup" enabled={authProviders.google} />
                                <GithubAuth auth={authWithGithub} type="signup" enabled={authProviders.github} />
                            </div>
                        </>
                    ) : (
                        <div style={{ marginTop: "80px" }} />
                    )}

                    <button type="submit" className={style.signupButton} disabled={softLoading}>{softLoading ? <SoftLoading /> : "Sign Up"}</button>
                </form>
                <Link href="/login" className={style.loginLink}>Already have an account? Log In</Link>

                {error && <p className="error">{error}</p>}
            </>}
        </Layout>
    )
}
