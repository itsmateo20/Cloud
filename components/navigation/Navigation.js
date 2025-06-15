// components/Navigation.js
"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import Loading from "../Loading";
import UserProfileDropdown from "./UserProfileDropdown";

import Image from "next/image";
import Link from "next/link";

import nav from "@/public/styles/navigation.module.css"

export function Navigation({ user, mobile }) {
    const router = useRouter();
    const pathname = usePathname();

    const searchBarInputRef = useRef(null);
    const searchBarRef = useRef(null);
    const searchResultsRef = useRef(null);
    const userDropdownRef = useRef(null);

    const [searchResults, setSearchResults] = useState(null);
    const [searchResultsLoading, setSearchResultsLoading] = useState(false);

    const isMobile = mobile || false;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                userDropdownRef.current &&
                !userDropdownRef.current.contains(event.target) &&
                !userProfileRef.current.contains(event.target)
            ) {
                if (userDropdownRef.current.classList.contains("show")) {
                    userDropdownRef.current.classList.remove("show");
                    userDropdownRef.current.classList.add("hide");
                }
            }

            // if (
            //     searchBarRef.current &&
            //     !searchBarRef.current.contains(event.target)
            // ) {
            //     if (searchBarRef.current.classList.contains("show")) {
            //         searchBarRef.current.classList.remove("show");
            //         searchBarRef.current.classList.add("hide");
            //     }
            //     if (searchResultsRef.current?.classList.contains("show")) {
            //         searchResultsRef.current.classList.remove("show");
            //         searchResultsRef.current.classList.add("hide");
            //         blurContent(false);
            //     }
            // }
        };

        // const handleInput = (event) => {
        //     if (event.target.value.length > 0) {
        //         setSearchResultsLoading(true);
        //         document.querySelector(".search-results-title-history")?.classList.add("hide");
        //         document.querySelector(".search-results-title-suggestion")?.classList.remove("hide");
        //         getSearchResults(event.target.value, true, { limit: 5, filter: ["notes", "exams"] }).then((results) => {
        //             if (JSON.parse(results).length !== 0) setSearchResults(results);
        //             else setSearchResults(false);

        //             setSearchResultsLoading(false);
        //         });
        //     } else {
        //         setSearchResults(null);
        //         setSearchResultsLoading(false);
        //         document.querySelector(".search-results-title-history")?.classList.remove("hide");
        //         document.querySelector(".search-results-title-suggestion")?.classList.add("hide");
        //     }
        // };

        // const handleClickSearchBar = () => {
        //     if (mobileInfo[0]) return router.push("/app/wyszukiwarka");
        //     searchBarRef.current.classList.add("show");
        //     searchBarRef.current.classList.remove("hide");
        //     searchResultsRef.current.classList.add("show");
        //     searchResultsRef.current.classList.remove("hide");
        //     blurContent(true);
        //     if (searchBarInputRef.current) {
        //         searchBarInputRef.current.focus();
        //     }
        // };

        // const searchValueCheck = () => {
        //     if (searchValue || searchBarInputRef.current?.value.length > 0) {
        //         searchBarRef.current?.classList.add("show");
        //         searchBarRef.current?.classList.remove("hide");
        //         searchBarInputRef.current.focus();
        //     }
        // };

        document.addEventListener("click", handleClickOutside);
        // searchBarInputRef.current?.addEventListener("input", handleInput);
        // searchBarRef.current?.addEventListener("click", handleClickSearchBar);
        // searchValueCheck();

        return () => {
            document.removeEventListener("click", handleClickOutside);
            // searchBarInputRef.current?.removeEventListener("input", handleInput);
            // searchBarRef.current?.removeEventListener("click", handleClickSearchBar);
            // searchValueCheck();
        };
    }, []);

    return (
        <>
            <div className={nav.navigation} >
                <nav className={nav.topBar}>
                    <Link className={nav.logo} href="/"><Suspense fallback={<Loading />}><Image src="/assets/logo/WObackground.png" alt="Cloud Storage Icon" width={54} height={33} quality={100} loading="eager" priority /></Suspense></Link>
                    {/* {!isMobile && <h1 className={nav.title}>Cloud</h1>} */}
                    <h1 className={nav.title}>Cloud</h1>
                    {/* <div className="search-bar hide" ref={searchBarRef}>
                            <Image src="/assets/app/search.svg" className="search-bar-icon" alt="Search" width={21} height={21} quality={100} loading="eager" />
                            <span className="search-bar-title">Wyszukaj w notespace</span>
                            <input type="text" ref={searchBarInputRef} defaultValue={searchValue} className="search-box-input" />
                            <div className="search-results hide" ref={searchResultsRef}>
                                <div className="search-results-header">
                                    <h1 className="search-results-title search-results-title-history">Historia wyszukiwania</h1>
                                    <h1 className="search-results-title search-results-title-suggestion hide">Propozycje wyszukiwania</h1>
                                    <button type="button" className="search-results-settings"><Image src="/assets/app/gear.svg" alt="Settings" width={17} height={17} quality={100} loading="lazy" />Zarządzaj</button>
                                </div>
                                <div className="searchResultsContent">
                                    {searchResultsLoading ?
                                        <Loading />
                                        :
                                        <ul>
                                            {(searchResults && JSON.parse(searchResults).length > 0) ? JSON.parse(searchResults).map((result, index) => (
                                                <li key={index} > <Link href={`/app/wyszukiwarka?search_query=${result.toLowerCase().replace(/ /g, "-")}`}><img src="/assets/app/search.svg" alt="History" width="20" height="20" /><span>{result}</span><img src="/assets/app/forward2.svg" alt="Arrow" width="22" height="22" /></Link></li>
                                            ))
                                                : (searchResults === false ? <li><span>Brak wyników</span></li> :
                                                    <>
                                                        <li>
                                                            <a>
                                                                <Image src="/assets/app/history.svg" alt="History" width={20} height={20} quality={100} loading="eager" />
                                                                <span>Układ krwionośny</span>
                                                                <Image src="/assets/app/forward2.svg" alt="Arrow" width={22} height={22} quality={100} loading="eager" />
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a>
                                                                <Image src="/assets/app/history.svg" alt="History" width={20} height={20} quality={100} loading="eager" />
                                                                <span>Układ oddechowy</span>
                                                                <Image src="/assets/app/forward2.svg" alt="Arrow" width={22} height={22} quality={100} loading="eager" />
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a>
                                                                <Image src="/assets/app/history.svg" alt="History" width={20} height={20} quality={100} loading="eager" />
                                                                <span>Układ nerwowy</span>
                                                                <Image src="/assets/app/forward2.svg" alt="Arrow" width={22} height={22} quality={100} loading="eager" />
                                                            </a>
                                                        </li>
                                                    </>
                                                )}
                                        </ul >
                                    }
                                </div>
                            </div>
                        </div> */}
                    {user ?
                        <UserProfileDropdown user={user} mobile={isMobile} />
                        :
                        null
                    }
                </nav >
            </div >
        </>
    );
}
