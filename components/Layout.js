// components/app/AppLayout.js

"use client";

import { useState, useEffect } from "react";
import { Navigation } from "./navigation/Navigation";
import Loading from "./Loading";

export default function Layout({ children, mainStyle, loading = true, user = null, sideNav = false, currentPath, onOpenSettings }) {
    const [showLoading, setShowLoading] = useState(loading);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        if (loading) {
            setShowLoading(true);
            setFadeOut(false);
        } else {
            // Start fade out
            setFadeOut(true);

            // Hide loading after fade out completes
            const timer = setTimeout(() => {
                setShowLoading(false);
            }, 1000); // Allow time for fade out animation

            return () => clearTimeout(timer);
        }
    }, [loading]);

    if (showLoading) {
        return <Loading fadeOut={fadeOut} />;
    }

    return (
        <main className={mainStyle}>
            <Navigation user={user} sideNav={sideNav} currentPath={currentPath} onOpenSettings={onOpenSettings} />
            {children}
        </main>
    );
}