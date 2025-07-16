// components/Loading.js

import style from "@/public/styles/loading.module.css";

import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className={style.loading}>
            <h1><Loader2 size={20} /> Loading...</h1>
        </div>
    );
}