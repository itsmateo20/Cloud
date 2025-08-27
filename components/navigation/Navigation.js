// components/Navigation.js
"use client";

import style from "@/components/navigation/Navigation.module.css";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useIsMobile } from "@/utils/useIsMobile";

import Loading from "@/components/Loading";
import UserProfileDropdown from "./UserProfileDropdown";
import { AlignJustify, Search } from "lucide-react";

export function Navigation({ user, sideNav = false, currentPath }) {
    const isMobile = useIsMobile();
    const pathname = usePathname();
    const navRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isOpened, setIsOpened] = useState(false);
    const [startX, setStartX] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const [initialTransform, setInitialTransform] = useState(0);

    const toggleNavigation = () => {
        if (!isMobile) return;

        const nav = navRef.current;
        if (!nav) return;
        const newOpenedState = !isOpened;
        setIsOpened(newOpenedState);
        nav.style.transform = newOpenedState
            ? "translate(0%, 0%)"
            : "translate(-100%, 0%)";
        nav.style.boxShadow = newOpenedState ? "5px 0 50px 100px rgba(0, 0, 0, 0.1)" : "none";
    };

    const closeNavigation = () => {
        if (!isMobile) return;

        const nav = navRef.current;
        if (!nav || !isOpened) return;

        setIsOpened(false);
        nav.style.transform = "translate(-100%, 0%)";
        nav.style.boxShadow = "none";
    };

    const handleStart = (clientX) => {
        if (!isMobile) return;

        const nav = navRef.current;
        if (!nav || !isOpened) return;

        setIsDragging(true);
        setStartX(clientX);
        setCurrentX(clientX);

        const transform = getComputedStyle(nav).transform;
        const matrix = new DOMMatrix(transform);
        setInitialTransform(matrix.m41);

        nav.style.transition = "box-shadow 0.8s ease";
    };

    const handleMove = (clientX) => {
        if (!isDragging || !isMobile) return;

        const nav = navRef.current;
        if (!nav) return;

        setCurrentX(clientX);
        const deltaX = clientX - startX;
        const newTransform = Math.min(0, initialTransform + deltaX);
        nav.style.transform = `translate(${newTransform}px, 0%)`;
        nav.style.boxShadow = "none";
    };

    const handleEnd = () => {
        if (!isDragging || !isMobile) return;

        const nav = navRef.current;
        if (!nav) return;

        setIsDragging(false);
        const deltaX = currentX - startX;
        const threshold = -50;

        nav.style.transition = "";

        if (deltaX < threshold) closeNavigation();
        else {
            nav.style.transform = "translate(0%, 0%)";
            nav.style.boxShadow = "5px 0 50px 100px rgba(0, 0, 0, 0.1)";
        }
    };

    // Touch events
    const handleTouchStart = (e) => {
        if (!isMobile) return;
        handleStart(e.touches[0].clientX);
    };

    const handleTouchMove = (e) => {
        if (!isMobile) return;
        e.preventDefault();
        handleMove(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!isMobile) return;
        handleEnd();
    };

    const handleMouseDown = (e) => {
        if (!isMobile) return;
        handleStart(e.clientX);
    };

    const handleMouseMove = (e) => {
        if (!isMobile) return;
        handleMove(e.clientX);
    };

    const handleMouseUp = () => {
        if (!isMobile) return;
        handleEnd();
    };

    useEffect(() => {
        if (!isDragging || !isMobile) return;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging, currentX, startX, isMobile]);

    useEffect(() => {
        if (!isMobile) return;

        function handleClickOutside(event) {
            const nav = navRef.current;
            const hamburgerButton = document.querySelector('[data-hamburger-button]');

            if (nav && isOpened && isMobile && !nav.contains(event.target) && !hamburgerButton?.contains(event.target) && !isDragging) closeNavigation();
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [isOpened, isDragging, isMobile]);
    useEffect(() => {
        if (!isDragging || !isMobile) return;

        const nav = navRef.current;
        if (!nav) return;

        const dragDistance = Math.max(0, Math.min(startX - currentX, 300));
        const progress = Math.min(dragDistance / 300, 1);

        const maxSpread = 100;
        const spread = maxSpread * (1 - progress);
        nav.style.boxShadow = `5px 0 50px ${spread}px rgba(0, 0, 0, 0.1)`;

        return () => {
            if (nav) nav.style.boxShadow = isOpened
                ? `5px 0 50px ${maxSpread}px rgba(0, 0, 0, 0.1)`
                : "none";
        };
    }, [isDragging, currentX, startX, isMobile, isOpened]);

    return (
        <>
            {isMobile && sideNav && currentPath == undefined && (
                <div className={style.searchContainer}>
                    <div className={style.searchBox}>
                        <div className={style.leftSide}>
                            <AlignJustify
                                size={20}
                                color="var(--text)"
                                strokeWidth={2}
                                onClick={toggleNavigation}
                                data-hamburger-button="true"
                            />
                            <h1 className={style.searchTitle}>Search</h1>
                        </div>
                        <Search size={20} color="var(--text)" strokeWidth={2} />
                    </div>
                </div>

            )}
            <nav
                ref={navRef}
                className={style.navigation}
                style={(!isMobile && pathname !== "/") ? { filter: "drop-shadow(3px 0px 50px rgba(0, 0, 0, 0.3))" } : null}
                onTouchStart={isMobile ? handleTouchStart : undefined}
                onMouseDown={isMobile ? handleMouseDown : undefined}
            >
                <div className={style.titleContainer}>
                    <Link className={style.logo} href="/">
                        <Suspense fallback={<Loading />}>
                            <Image src="/assets/logo/logo.png" alt="Cloud Storage Icon" width={54} height={33} quality={100} loading="eager" priority />
                        </Suspense>
                    </Link>
                    <h1 className={style.title}>Cloud</h1>
                </div>
                {user ? <UserProfileDropdown user={user} mobile={isMobile} /> : null}
            </nav >
        </>
    );
}
