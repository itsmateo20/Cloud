"use client";

import style from "./ThirdPartyAuthStyle.module.css";
import { MessageCircle } from "lucide-react";

export function DiscordAuth({ auth, type, enabled = true }) {
    if (!enabled) return null;

    return (
        <div className={style.googleAuth}>
            <button type="button" className={style.gsiMaterialButton} onClick={() => auth(type)} aria-label="Continue with Discord">
                <div className={style.gsiMaterialButtonState}></div>
                <div className={style.gsiMaterialButtonContentWrapper}>
                    <div className={style.gsiMaterialButtonIcon}>
                        <MessageCircle size={20} aria-hidden="true" />
                    </div>
                    <span style={{ display: "none" }}>Sign in with Discord</span>
                </div>
            </button>
        </div>
    );
}
