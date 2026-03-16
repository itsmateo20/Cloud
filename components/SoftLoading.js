// components/SoftLoading.js

"use client";

import { useEffect, useState } from "react";

import style from "@/public/styles/loading.module.css";

import { Loader2 } from "lucide-react";

export default function SoftLoading({ styleOverride, active = true, fadeDuration = 220 }) {
    const [shouldRender, setShouldRender] = useState(active);

    useEffect(() => {
        if (active) {
            setShouldRender(true);
            return;
        }

        const timer = setTimeout(() => {
            setShouldRender(false);
        }, fadeDuration);

        return () => clearTimeout(timer);
    }, [active, fadeDuration]);

    if (!shouldRender) return null;

    const baseClass = styleOverride ? styleOverride.softLoading : style.softLoading;
    const fadeClass = active ? "" : style.softFadeOut;

    return (
        <div className={`${baseClass} ${fadeClass}`.trim()}>
            <Loader2 size={23} />
        </div>
    );
}