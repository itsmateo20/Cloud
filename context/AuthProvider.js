"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { api } from "@/utils/api";
import { NextResponse } from "next/server";

const AuthContext = createContext();

export const AuthProvider = ({ children, locked = true }) => {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [softLoading, setSoftLoading] = useState(false);

    const publicRoutes = [
        "/login",
        "/login/google",
        "/signup",
        "/signup/google",
        "/link-account/google",
    ];

    useEffect(() => {
        const checkAuthAndRoute = async () => {
            try {
                setLoading(true);

                const routeRes = await fetch(pathname);
                if (routeRes.status === 404) {
                    setLoading(false);
                    return;
                }

                const sessionRes = await api.post("/api/auth/session");
                if (!sessionRes.success) {
                    setUser(null);
                    if (sessionRes.code === "not_authenticated" && locked && !publicRoutes.includes(pathname)) return router.push("/login");
                } else {
                    setUser(sessionRes.user);
                    if (publicRoutes.includes(pathname)) return router.push("/");
                }
            } catch (error) {
                return NextResponse.json({ success: false, code: "auth_check_failed", error }, { status: 500 });
            }

            setLoading(false);
        };

        checkAuthAndRoute();
    }, [pathname, locked, router]);

    const login = async (email, password) => {
        setSoftLoading(true);
        try {
            const data = await api.post("/api/auth/login", { email, password });
            if (!data.success) return NextResponse.json({ success: false, code: data.code });
            setUser(data.user);
            router.push("/");
        } catch (error) {
            return NextResponse.json({ success: false, error: error.message });
        } finally {
            setSoftLoading(false);
        }
    };

    const signup = async (email, password) => {
        setSoftLoading(true);
        try {
            const data = await api.post("/api/auth/signup", { email, password });
            if (!data.success) return NextResponse.json({ success: false, code: data.code });
            setUser(data.user);
            router.push("/");
        } catch (error) {
            return NextResponse.json({ success: false, error: error.message });
        } finally {
            setSoftLoading(false);
        }
    };

    const signupwiththirdparty = async (email, password, type, signature) => {
        setSoftLoading(true);
        try {
            const data = await api.post("/api/auth/thirdparty/signup", {
                email,
                password,
                type,
                signature
            });
            if (!data.success) return NextResponse.json({ success: false, code: data.code });
            setUser(data.user);
            router.push("/");
        } catch (error) {
            return NextResponse.json({ success: false, error: error.message });
        } finally {
            setSoftLoading(false);
        }
    };

    const signout = async () => {
        setSoftLoading(true);
        try {
            const data = await api.post("/api/auth/signout");
            if (!data.success) return NextResponse.json({ success: false, code: data.code });
            setUser(null);
            router.push("/login");
        } catch (error) {
            return NextResponse.json({ success: false, error: error.message });
        } finally {
            setSoftLoading(false);
        }
    };

    const linkAccount = async (googleEmail, email, password, type) => {
        setSoftLoading(true);
        try {
            const data = await api.post("/api/auth/link", {
                googleEmail,
                email,
                password,
                type,
            });
            if (!data.success) return NextResponse.json({ success: false, code: data.code });
            setUser(data.user);
            router.push("/");
        } catch (error) {
            return NextResponse.json({ success: false, error: error.message });
        } finally {
            setSoftLoading(false);
        }
    };

    const authWithGoogle = (type) => {
        window.location.href = `/api/auth/google/auth?type=${type}`;
    };

    const clearDatabase = async () => {
        try {
            const res = await api.post("/api/database/clear");
            if (!res.success) return NextResponse.json({ success: false, code: res.code, error: res.error });
            router.refresh();
        } catch (error) {
            return NextResponse.json({ success: false, code: "clear_database_error", error });
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                softLoading,
                login,
                signup,
                signupwiththirdparty,
                signout,
                linkAccount,
                authWithGoogle,
                clearDatabase,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
