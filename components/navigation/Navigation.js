// components/Navigation.js
"use client";

import style from "@/components/navigation/Navigation.module.css";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useIsMobile } from "@/utils/useIsMobile";

import Loading from "@/components/Loading";
import UserProfileDropdown from "./UserProfileDropdown";

export function Navigation({ user }) {
    const isMobile = useIsMobile();
    const pathname = usePathname();

    return (
        <style className={style.navigation} style={pathname !== "/" ? { filter: "drop-shadow(3px 0px 50px rgba(0, 0, 0, 0.3))" } : null}>
            <Link className={style.logo} href="/">
                <Suspense fallback={<Loading />}>
                    <Image src="/assets/logo/logo.png" alt="Cloud Storage Icon" width={54} height={33} quality={100} loading="eager" priority />
                </Suspense>
            </Link>
            <h1 className={style.title}>Cloud</h1>
            {user ? <UserProfileDropdown user={user} mobile={isMobile} /> : null}
        </style >
    );
}
