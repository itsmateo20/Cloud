// components/authentication/GithubAuth.js

"use client";

import style from "./ThirdPartyAuthStyle.module.css";

import Image from "next/image";
import { withBasePath } from "@/lib/basePath";

export function GithubAuth({ auth, type, enabled = true }) {
    if (enabled) return (
        <div className={style.googleAuth}>
            <button type="button" className={style.gsiMaterialButton} onClick={() => auth(type)} aria-label="Continue with GitHub">
                <div className={style.gsiMaterialButtonState}></div>
                <div className={style.gsiMaterialButtonContentWrapper}>
                    <div className={`${style.gsiMaterialButtonIcon} ${style.gsiMaterialButtonIconGithub}`}>
                        <Image src={withBasePath("/assets/authentication/GithubAuth.svg")} loading="eager" width={20} height={20} alt="Github" className={style.gsiMaterialButtonIconSVG} />
                    </div>
                    <span style={{ display: "none" }}>Sign in with Github</span>
                </div>
            </button>
        </div>
    )
    else return null;
}