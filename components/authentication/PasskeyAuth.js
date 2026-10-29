// components/authentication/PasskeyAuth.js

"use client";

import style from "./ThirdPartyAuthStyle.module.css";

import { KeyRound } from "lucide-react";

export function PasskeyAuth({ auth }) {
    return (
        <div className={style.googleAuth}>
            <button type="button" className={style.gsiMaterialButton} onClick={() => auth()} aria-label="Continue with Passkey">
                <div className={style.gsiMaterialButtonState}></div>
                <div className={style.gsiMaterialButtonContentWrapper}>
                    <div className={style.gsiMaterialButtonIcon}>
                        <KeyRound size={20} strokeWidth={3} />
                    </div>
                    <span style={{ display: "none" }}>Sign in with Passkey</span>
                </div>
            </button>
        </div>
    );
}