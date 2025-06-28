// app/signup/google/page.js
"use client";

import { useAuth } from "@/context/AuthProvider";
import Layout from "@/components/Layout";
import googleSignupStyle from "@/public/styles/googleAuth.module.css";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getError } from "@/public/error/errors";

import SoftLoading from "@/components/SoftLoading";

import { IoClose } from "react-icons/io5";
import { BsCheck } from "react-icons/bs";

export default function Page({ searchParams }) {
    const { loading, softLoading, user, signupwiththirdparty } = useAuth();

    const [isMobile, setIsMobile] = useState(null);
    const { email, signature } = use(searchParams) || {};
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
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
                        return redirect("/signup");
                    }
                })
                .catch(error => {
                    console.error(error);
                    console.log("invalid-signature-redirect")
                    return redirect("/signup");
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
    }, [email, password, repeatPassword]);

    const handleSignup = async () => {
        setError("");
        const signatureValue = signature || null;

        if (!signatureValue) {
            const errorMsg = await getError("email_signature_missing", { detailed: false, lang: "en" });
            setError(errorMsg.message);
        } else {
            if (passwordRequirements.uppercase && passwordRequirements.lowercase && passwordRequirements.number && passwordRequirements.special && passwordRequirements.minLength && passwordRequirements.matching) {
                const response = await signupwiththirdparty(email, password, "google", signatureValue);
                const errorMsg = await getError(response.code, { detailed: false, lang: "en" });
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
        <Layout mainStyle={googleSignupStyle.main} loading={loading} mobile={isMobile} user={user}>
            <h1 className={googleSignupStyle.title}>Google Signup</h1>
            <h2 className={googleSignupStyle.subtitle}>Create a password for your account.</h2>
            <fieldset className={googleSignupStyle.inputWithText}>
                <legend>Email</legend>
                <input
                    type="email"
                    name="email"
                    value={email}
                    disabled
                />
            </fieldset>

            <fieldset className={googleSignupStyle.inputWithText}>
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

            <fieldset className={googleSignupStyle.inputWithText}>
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

            <div className={googleSignupStyle.passwordRequirements}>
                <h1>{passwordRequirements.uppercase ? <BsCheck size={20} /> : <IoClose size={20} />} Uppercase letter</h1>
                <h1>{passwordRequirements.lowercase ? <BsCheck size={20} /> : <IoClose size={20} />} Lowercase letter</h1>
                <h1>{passwordRequirements.number ? <BsCheck size={20} /> : <IoClose size={20} />} Number</h1>
                <h1>{passwordRequirements.special ? <BsCheck size={20} /> : <IoClose size={20} />} Special character</h1>
                <h1>{passwordRequirements.minLength ? <BsCheck size={20} /> : <IoClose size={20} />} 8 characters</h1>
                <h1>{passwordRequirements.matching ? <BsCheck size={20} /> : <IoClose size={20} />} Match passwords</h1>
            </div>

            <button onClick={handleSignup} type="button" className={googleSignupStyle.signupButton} disabled={softLoading}>{softLoading ? <SoftLoading /> : "Sign up"}</button>

            {error && <p className="error">{error}</p>}
        </Layout>
    )
}
