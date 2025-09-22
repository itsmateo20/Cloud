// components/SoftLoading.js

import style from "@/public/styles/loading.module.css";

import { Loader2 } from "lucide-react";

export default function SoftLoading({ styleOverride }) {
    return (
        <div className={styleOverride ? styleOverride.softLoading : style.softLoading}>
            <Loader2 size={23} />
        </div>
    );
}