// components/SoftLoading.js

import loading from "@/public/styles/loading.module.css";

import { AiOutlineLoading3Quarters } from "react-icons/ai";

export default function SoftLoading({ style }) {
    return (
        <div className={style ? style.softLoading : loading.softLoading}>
            <AiOutlineLoading3Quarters size={23} />
        </div>
    );
}