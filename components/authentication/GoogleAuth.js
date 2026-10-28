// components/authentication/GoogleAuth.js
"use client";

import style from "./ThirdPartyAuthStyle.module.css";

import Image from "next/image";
import { withBasePath } from "@/lib/basePath";

export function GoogleAuth({ auth, type, enabled = true }) {

    if (enabled) return (
        <div className={style.googleAuth}>
            <button type="button" className={style.gsiMaterialButton} onClick={() => auth(type)}>
                <div className={style.gsiMaterialButtonState}></div>
                <div className={style.gsiMaterialButtonContentWrapper}>
                    <div className={style.gsiMaterialButtonIcon}>
                        <Image src={withBasePath("/assets/authentication/GoogleAuth.svg")} width={20} height={20} alt="Google" />
                    </div>
                    <span style={{ display: "none" }}>Sign in with Google</span>
                </div>
            </button>
        </div>
    )
}
