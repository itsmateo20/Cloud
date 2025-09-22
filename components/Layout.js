// components/app/AppLayout.js

"use client";

import { Navigation } from "./navigation/Navigation";
import Loading from "./Loading";

export default function Layout({ children, mainStyle, loading = true, user = null, sideNav = false, currentPath }) {
    if (loading) return <Loading />;

    return (
        <main className={mainStyle}>
            <Navigation user={user} sideNav={sideNav} currentPath={currentPath} />
            {children}
        </main>
    );
}