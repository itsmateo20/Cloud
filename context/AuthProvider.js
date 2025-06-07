"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children, locked = true }) => {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const publicRoutes = ['/login', '/login/google', '/signup', '/signup/google', '/link-account/google'];

    useEffect(() => {
        const checkAuthAndRoute = () => {
            setLoading(true);

            // Check route validity
            fetch(pathname)
                .catch(error => {
                    console.log("Route check error:", error);
                })
                .then(response => {
                    if (response && response.status === 404) {
                        setLoading(false);
                        return;
                    }

                    return fetch('/api/auth/session', { method: 'POST' });
                })
                .then(response => response?.json())
                .then(data => {
                    if (!data.success) {
                        if (data.code === 'not_authenticated') {
                            setUser(null);
                            if (locked && !publicRoutes.includes(pathname)) {
                                return router.push("/login");
                            }
                        }
                    } else {
                        setUser(data.user);
                        if (publicRoutes.includes(pathname)) {
                            return router.push("/");
                        }
                    }
                })
                .catch(error => {
                    console.log(error);
                })
                .finally(() => {
                    setLoading(false);
                });
        };

        checkAuthAndRoute();
    }, [pathname, locked, router]);

    const login = (email, password) => {
        // setLoading(true);
        return fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    return { success: false, code: data.code };
                }
                setUser(data.user);
                router.push("/");
            })
            .catch(error => {
                return { success: false, error: error.message };
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const signup = (email, password) => {
        setLoading(true);
        return fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    return { success: false, code: data.code };
                }
                setUser(data.user);
                router.push("/");
            })
            .catch(error => {
                return { success: false, error: error.message };
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const signout = () => {
        setLoading(true);
        return fetch('/api/auth/signout', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    return { success: false, code: data.code };
                }
                setUser(null);
                router.push("/login");
            })
            .catch(error => {
                return { success: false, error: error.message };
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const authWithGoogle = (type) => {
        window.location.href = `/api/auth/google/auth?type=${type}`;
    };

    const linkAccount = (googleEmail, email, password, type) => {
        setLoading(true);
        return fetch('/api/auth/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ googleEmail, email, password, type }),
        })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    return { success: false, code: data.code };
                }
                setUser(data.user);
                router.push("/");
            })
            .catch(error => {
                return { success: false, error: error.message };
            })
            .finally(() => {
                setLoading(false);
            });
    };


    // temporary function to clear the database
    const clearDatabase = () => {
        return fetch('/api/database/clear', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    return { success: false, code: data.code, error: data.error };
                }
                return router.refresh();
            })
            .catch(error => {
                console.log(error);
                return { success: false, error: error.message };
            });
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            authWithGoogle,
            signup,
            signout,
            linkAccount,
            clearDatabase
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);