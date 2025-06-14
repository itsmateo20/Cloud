// components/Loading.js

import loading from "@/public/styles/loading.module.css";

import { AiOutlineLoading3Quarters } from "react-icons/ai";

export default function Loading() {
    return (
        <div className={loading.loading}>
            <h1><AiOutlineLoading3Quarters size={20} /> Loading...</h1>
        </div>
    );
}