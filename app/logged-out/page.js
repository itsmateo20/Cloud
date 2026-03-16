// app/logged-out/page.js
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/utils/api";
import { useState } from "react";
import style from "@/public/styles/login.module.css";

export default function LoggedOutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [submitting, setSubmitting] = useState(false);
    const reason = searchParams.get("reason");

    const handleLogout = async () => {
        setSubmitting(true);
        try {
            await api.post("/api/auth/signout");
        } catch {
        } finally {
            setSubmitting(false);
            router.push("/login");
        }
    };

    const handleLogin = () => {
        router.push("/login");
    };

    return (
        <main className={style.main} style={{ justifyContent: "center", alignItems: "center", textAlign: "center", gap: 16 }}>
            <h1 className={style.title}>This device was logged out</h1>
            <p className={style.subtitle}>
                {reason === "remote"
                    ? "Your session was removed remotely from another device."
                    : "Your session is no longer active on this device."}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
                <button onClick={handleLogout} className={style.loginButton} disabled={submitting}>
                    {submitting ? "Logging out..." : "Logout"}
                </button>
                <button onClick={handleLogin} className={style.loginButton}>
                    Login
                </button>
            </div>
        </main>
    );
}
