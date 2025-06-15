// components/Navigation.js

"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import Loading from "@/components/Loading";
import UserProfileDropdown from "./UserProfileDropdown";

import Image from "next/image";
import Link from "next/link";

import nav from "@/components/navigation/Navigation.module.css";

export function Navigation({ user, mobile }) {
    const isMobile = mobile || false;

    const pathname = usePathname();

    return (
        <nav className={nav.navigation} style={pathname !== '/' ? { filter: 'drop-shadow(3px 0px 50px rgba(0, 0, 0, 0.3))' } : null}>
            <Link className={nav.logo} href="/">
                <Suspense fallback={<Loading />}>
                    <Image src="/assets/logo/WObackground.png" alt="Cloud Storage Icon" width={54} height={33} quality={100} loading="eager" priority />
                </Suspense>
            </Link>
            <h1 className={nav.title}>Cloud</h1>
            {user ? <UserProfileDropdown user={user} mobile={isMobile} /> : null}
        </nav >
    );
}
