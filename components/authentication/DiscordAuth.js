// components/authentication/DiscordAuth.js

"use client";

import style from "./ThirdPartyAuthStyle.module.css";

import Image from "next/image";
import { withBasePath } from "@/lib/basePath";

export function DiscordAuth({ auth, type, enabled = true }) {
    if (enabled) return (
        <div className={style.googleAuth}>
            <button type="button" className={style.gsiMaterialButton} onClick={() => auth(type)} aria-label="Continue with Discord">
                <div className={style.gsiMaterialButtonState}></div>
                <div className={style.gsiMaterialButtonContentWrapper}>
                    <div className={style.gsiMaterialButtonIcon}>
                        <Image src={withBasePath("/assets/authentication/DiscordAuth.svg")} width={20} height={20} alt="Discord" />
                    </div>
                    <span style={{ display: "none" }}>Sign in with Discord</span>
                </div>
            </button>
        </div>
    )
    else return null;
}
