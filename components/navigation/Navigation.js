// components/Navigation.js
"use client";

import style from "./Navigation.module.css";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useIsMobile } from "@/utils/useIsMobile";

import UserProfileDropdown from "./UserProfileDropdown";
import { AlignJustify, Search } from "lucide-react";

export function Navigation({ user, sideNav = false, currentPath, onOpenSettings, onOpenShares }) {
    const isMobile = useIsMobile();
    const deviceResolved = typeof isMobile === "boolean";
    const pathname = usePathname();
    const navRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isOpened, setIsOpened] = useState(false);
    const [startX, setStartX] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const [initialTransform, setInitialTransform] = useState(0);
    const navWidthRef = useRef(0);
    const lastMoveXRef = useRef(0);
    const lastMoveTimeRef = useRef(0);
    const velocityRef = useRef(0);

    const isSideNavMobileSearch = sideNav && currentPath == undefined && user;

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
        if (!nav) return;

        if (!isOpened && clientX > 30) return;

        navWidthRef.current = nav.offsetWidth || 0;

        setIsDragging(true);
        setStartX(clientX);
        setCurrentX(clientX);
        lastMoveXRef.current = clientX;
        lastMoveTimeRef.current = performance.now();
        velocityRef.current = 0;

        const transform = getComputedStyle(nav).transform;
        const matrix = new DOMMatrix(transform);
        setInitialTransform(isOpened ? matrix.m41 : -navWidthRef.current);

        nav.style.willChange = "transform";
        nav.style.transition = "box-shadow 0.8s ease";
        if (!isOpened) nav.style.transform = `translate(${-navWidthRef.current}px, 0%)`;
    };

    const handleMove = (clientX) => {
        if (!isDragging || !isMobile) return;
        const nav = navRef.current;
        if (!nav) return;

        setCurrentX(clientX);
        const now = performance.now();
        const dt = Math.max(1, now - lastMoveTimeRef.current);
        const dxSinceLast = clientX - lastMoveXRef.current;
        velocityRef.current = dxSinceLast / dt;
        const deltaX = clientX - startX;
        const newTransform = Math.min(0, Math.max(-navWidthRef.current, initialTransform + deltaX));
        nav.style.transform = `translate(${newTransform}px, 0%)`;
        nav.style.boxShadow = "none";

        lastMoveXRef.current = clientX;
        lastMoveTimeRef.current = now;
    };

    const handleEnd = () => {
        if (!isDragging || !isMobile) return;
        const nav = navRef.current;
        if (!nav) return;

        setIsDragging(false);
        nav.style.willChange = "";

        const deltaX = currentX - startX;
        const velocity = velocityRef.current;

        const currentTransform = new DOMMatrix(getComputedStyle(nav).transform).m41;
        const openness = 1 - Math.abs(currentTransform) / (navWidthRef.current || 1);

        const shouldClose = () => {
            if (velocity < -0.45) return true;
            if (velocity > 0.45) return false;
            if (openness < 0.5) return true;
            if (deltaX < -50) return true;
            return false;
        };

        const closing = shouldClose();
        const absVelocity = Math.abs(velocity);
        const duration = Math.max(90, Math.min(260, Math.round(240 - absVelocity * 180)));
        nav.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease`;

        if (closing) {
            nav.style.transform = `translate(${-navWidthRef.current}px, 0%)`;
            nav.style.boxShadow = "none";
            setTimeout(() => setIsOpened(false), 0);
        } else {
            nav.style.transform = "translate(0px, 0%)";
            nav.style.boxShadow = "5px 0 50px 100px rgba(0, 0, 0, 0.1)";
            setIsOpened(true);
        }
    };

    const handleTouchStart = (e) => {
        if (!isMobile) return;
        if (!isOpened && e.touches?.[0]?.clientX > 30) return;
        e.preventDefault();
        e.stopPropagation();
        handleStart(e.touches[0].clientX);
    };

    const handleTouchMove = (e) => {
        if (!isMobile) return;
        e.preventDefault();
        e.stopPropagation();
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

        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overscrollBehaviorX = 'none';

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {

            document.body.style.overflowX = '';
            document.documentElement.style.overscrollBehaviorX = '';

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
        if (!isMobile || !user) return;

        const preventBrowserNavigation = (e) => {

            if (e.touches && e.touches.length === 1) {
                const touch = e.touches[0];
                if (touch.clientX <= 30) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };

        document.documentElement.style.overscrollBehaviorX = 'none';
        document.body.style.overscrollBehaviorX = 'none';

        document.addEventListener('touchstart', preventBrowserNavigation, { passive: false, capture: true });

        return () => {

            document.documentElement.style.overscrollBehaviorX = '';
            document.body.style.overscrollBehaviorX = '';
            document.removeEventListener('touchstart', preventBrowserNavigation, { capture: true });
        };
    }, [isMobile, user]);

    useEffect(() => {
        if (!isDragging || !isMobile) return;
        const nav = navRef.current;
        if (!nav) return;
        let raf;
        const update = () => {
            const width = navWidthRef.current || 300;
            const dragDistance = Math.max(0, Math.min(startX - currentX, width));
            const progress = Math.min(dragDistance / width, 1);
            const maxSpread = 100;
            const spread = maxSpread * (1 - progress);
            nav.style.boxShadow = `5px 0 50px ${spread}px rgba(0, 0, 0, 0.1)`;
        };
        raf = requestAnimationFrame(update);
        return () => cancelAnimationFrame(raf);
    }, [isDragging, currentX, startX, isMobile]);

    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;

        if (!isMobile) {

            setIsOpened(false);
            setIsDragging(false);
            nav.style.transform = '';
            nav.style.boxShadow = '';
            nav.style.transition = '';
        } else {

            if (!isOpened) {
                nav.style.transform = 'translate(-100%, 0%)';
                nav.style.boxShadow = 'none';
            }
        }
    }, [isMobile]);

    return (
        <>
            {isMobile && isSideNavMobileSearch && (
                <div className={style.searchContainer}>
                    <div className={style.searchBox}>
                        <div className={style.leftSide}>
                            <AlignJustify
                                size={20}
                                color="var(--text)"
                                strokeWidth={2}
                                onClick={toggleNavigation}
                                data-hamburger-button="true"
                                aria-label="Toggle navigation"
                                aria-expanded={isOpened}
                            />
                            <h1 className={style.searchTitle}>Search</h1>
                        </div>
                        <Search size={20} color="var(--text)" strokeWidth={2} />
                    </div>
                </div>
            )}
            {isMobile && isOpened && user && <div className="overlay" onClick={closeNavigation} />}
            {isMobile && !isOpened && user && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: '30px',
                        zIndex: 50,
                        touchAction: 'none'
                    }}
                    onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleStart(e.touches[0].clientX);
                    }}
                    onTouchMove={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMove(e.touches[0].clientX);
                    }}
                    onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEnd();
                    }}
                    onMouseDown={(e) => handleStart(e.clientX)}
                    onMouseMove={(e) => handleMove(e.clientX)}
                    onMouseUp={handleEnd}
                    onMouseLeave={() => isDragging && handleEnd()}
                />
            )}
            <nav
                ref={navRef}
                className={`${style.navigation} ${isSideNavMobileSearch ? style.mobileSideNav : ''} ${isMobile ? style.mobile : ''} ${isOpened ? style.opened : ''}`}
                style={(!isMobile && pathname !== "/") ? { filter: "drop-shadow(3px 0px 50px rgba(0, 0, 0, 0.3))" } : null}
                role="navigation"
                aria-label="Primary"
                aria-hidden={isMobile ? (!isOpened).toString() : "false"}
                aria-expanded={isMobile ? isOpened : true}
                onTouchStart={isMobile && user ? handleTouchStart : undefined}
                onMouseDown={isMobile && user ? handleMouseDown : undefined}
            >
                <div className={style.titleContainer}>
                    <Link className={style.logo} href="/">
                        <Suspense fallback={null}>
                            <Image src="/assets/logo/logo.png" alt="Cloud Storage Icon" width={54} height={33} quality={100} loading="eager" priority />
                        </Suspense>
                    </Link>
                    <h1 className={style.title}>Cloud</h1>
                </div>
                {user && deviceResolved ? <UserProfileDropdown user={user} mobile={isMobile} onOpenSettings={onOpenSettings} onOpenShares={onOpenShares} /> : null}
            </nav>
        </>
    );
}
