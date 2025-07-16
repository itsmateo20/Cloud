// app/signup/page.js
"use client";

import style from "@/public/styles/signup.module.css";

import { useAuth } from "@/context/AuthProvider";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { GoogleAuth } from "@/components/authentication/GoogleAuth";
import Layout from "@/components/Layout";
import SoftLoading from "@/components/SoftLoading";

import { X, Check } from "lucide-react";

import { getError } from "@/public/error/errors";

export default function Page() {
    const { loading, softLoading, user, signup, authWithGoogle } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
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
    }, [email, password, repeatPassword]);

    const handleSignup = async () => {
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
        <Layout mainStyle={style.main} loading={loading} user={user}>
            <h1 className={style.title}>Signup</h1>
            <h2 className={style.subtitle}>Make an account for your cloud storage</h2>
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
                                ? "/assets/authentication/VisibilityOn.svg"
                                : "/assets/authentication/VisibilityOff.svg"
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

            <div className={style.passwordRequirements}>
                <h1>{passwordRequirements.uppercase ? <Check size={20} /> : <X size={20} />} Uppercase letter</h1>
                <h1>{passwordRequirements.lowercase ? <Check size={20} /> : <X size={20} />} Lowercase letter</h1>
                <h1>{passwordRequirements.number ? <Check size={20} /> : <X size={20} />} Number</h1>
                <h1>{passwordRequirements.special ? <Check size={20} /> : <X size={20} />} Special character</h1>
                <h1>{passwordRequirements.minLength ? <Check size={20} /> : <X size={20} />} 8 characters</h1>
                <h1>{passwordRequirements.matching ? <Check size={20} /> : <X size={20} />} Match passwords</h1>
            </div>

            <GoogleAuth auth={authWithGoogle} type="signup" />

            <button onClick={handleSignup} type="button" className={style.signupButton} disabled={softLoading}>{softLoading ? <SoftLoading /> : "Sign Up"}</button>
            <Link href="/login" className={style.loginLink}>Already have an account? Log In</Link>

            {error && <p className="error">{error}</p>}
        </Layout>
    )
}
