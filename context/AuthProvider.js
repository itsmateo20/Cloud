// context/AuthProvider.js

"use client";

import { api } from "@/utils/api";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const AuthContext = createContext();

export const AuthProvider = ({ children, locked = true }) => {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [softLoading, setSoftLoading] = useState(false);

    const staticPublicRoutes = [
        "/login",
        "/login/google",
        "/signup",
        "/signup/google",
    ];

    const isPublicRoute = (currentPath) => {
        if (staticPublicRoutes.includes(currentPath)) {
            return true;
        }

        if (currentPath.startsWith('/qr/') && currentPath.split('/').length === 3) {
            return true;
        }

        return false;
    };

    const shouldRedirectAuthenticated = (currentPath) => {
        if (currentPath.startsWith('/qr/') && currentPath.split('/').length === 3) {
            return false;
        }

        return staticPublicRoutes.includes(currentPath);
    };

    useEffect(() => {
        const checkAuthAndRoute = async () => {
            try {
                setLoading(true);

                const routeRes = await api.raw('GET', pathname);
                if (routeRes.status === 404) {
                    setLoading(false);
                    return;
                }

                const sessionRes = await api.post("/api/auth/session");
                const isAuthenticated = sessionRes.success;

                if (isAuthenticated) {
                    setUser(sessionRes.user);

                    if (shouldRedirectAuthenticated(pathname)) {
                        router.push("/");
                        return;
                    }
                } else {
                    setUser(null);
                }

                if (isPublicRoute(pathname)) {
                    return;
                } else {

                    if (!isAuthenticated && locked) {
                        router.push("/login");
                        return;
                    }
                }

            } catch (error) {

            } finally {
                setLoading(false);
            }
        };

        checkAuthAndRoute();
    }, [pathname, locked, router]);

    const login = async (email, password) => {
        setSoftLoading(true);
        try {
            const data = await api.post("/api/auth/login", { email, password });
            if (!data.success) return { success: false, code: data.code };
            setUser(data.user);

            const urlParams = new URLSearchParams(window.location.search);
            const redirectTo = urlParams.get('redirect');

            if (redirectTo) {
                router.push(redirectTo);
            } else {
                router.push("/");
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setSoftLoading(false);
        }
    };

    const signup = async (email, password) => {
        setSoftLoading(true);
        try {
            const data = await api.post("/api/auth/signup", { email, password });
            if (!data.success) return { success: false, code: data.code };
            setUser(data.user);
            router.push("/");
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
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
            if (!data.success) return { success: false, code: data.code };
            setUser(data.user);
            router.push("/");
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setSoftLoading(false);
        }
    };

    const signout = async () => {
        setSoftLoading(true);
        try {
            const data = await api.post("/api/auth/signout");
            if (!data.success) return { success: false, code: data.code };
            setUser(null);
            router.push("/login");
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
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
            if (!data.success) return { success: false, code: data.code };
            setUser(data.user);
            router.push("/");
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setSoftLoading(false);
        }
    };

    const authWithGoogle = (type) => {
        window.location.href = `/api/auth/google/auth?type=${type}`;
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
                authWithGoogle
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
