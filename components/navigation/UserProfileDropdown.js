// components/navigation/UserProfileDropdown.js

"use client";

import { useAuth } from "@/context/AuthProvider";

import { useEffect, Suspense, useState, useRef } from "react";
import gravatar from "gravatar";

import SoftLoading from "@/components/SoftLoading";

import Image from "next/image";

import nav from "@/components/navigation/UserProfileDropdown.module.css";
import { LogOut } from "lucide-react";

export default function UserProfileDropdown({ user, mobile }) {
    const { signout } = useAuth();
    const userProfileRef = useRef(null);
    const userDropdownRef = useRef(null);
    const hideTimeoutRef = useRef(null);

    const [openedManually, setOpenedManually] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const [dropdownVisible, setDropdownVisible] = useState(false);

    useEffect(() => {
        const gravatarUrl = gravatar.url(user.email, { s: "120", r: "pg", d: "identicon" });
        setProfileImage(gravatarUrl);

        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        function handleClickOutside(e) {
            if (
                dropdownVisible &&
                userProfileRef.current &&
                !userProfileRef.current.contains(e.target)
            ) {
                setOpenedManually(false);
                setDropdownVisible(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownVisible]);

    function dropdownToggle(e) {
        if (
            e &&
            userDropdownRef.current &&
            (userDropdownRef.current.contains(e.target) || userDropdownRef.current === e.target)
        ) return;

        if (dropdownVisible && openedManually) {
            setDropdownVisible(false);
            setOpenedManually(false);
        } else {
            setDropdownVisible(true);
            setOpenedManually(true);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        }
    }

    if (mobile) {
        return (
            <>
                {profileImage ? <Image className={nav.userProfileImg} src={"https:" + profileImage} alt="User profile picture" width={30} height={30} loading="eager" /> : <SoftLoading className={nav.userProfileImg} />}
            </>
        );
    } else return (
        <div
            className={nav.userProfile}
            ref={userProfileRef}
            onClick={(e) => {
                dropdownToggle(e);
            }}
            onMouseEnter={() => {
                if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                setDropdownVisible(true);
            }}
            onMouseLeave={() => {
                if (openedManually) return;
                hideTimeoutRef.current = setTimeout(() => {
                    setDropdownVisible(false);
                }, 1000);
            }}
        >
            <span>{user.email}</span>
            {profileImage
                ? <Image className={nav.userProfileImg} src={"https:" + profileImage} alt="User profile picture" width={30} height={30} loading="eager" />
                : <SoftLoading className={nav.userProfileImg} />
            }

            <div
                className={`${nav.userDropdown} ${dropdownVisible ? nav.show : nav.hide}`}
                ref={userDropdownRef}
                onMouseEnter={() => {
                    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                }}
                onMouseLeave={() => {
                    if (openedManually) return;
                    hideTimeoutRef.current = setTimeout(() => {
                        setDropdownVisible(false);
                    }, 1000);
                }}
            >
                <ul>
                    <li onClick={() => signout()}><span>Logout</span><LogOut size={22} /></li>
                </ul>
            </div>
        </div>

    );
}