// app/login/github/page.js

import ThirdPartyAuthPage from "@/components/authentication/ThirdPartyAuthPage";
import { notFound } from "next/navigation";

export default async function Page({ params, searchParams }) {
    const { provider } = await params;

    if (!["google", "github"].includes(provider)) {
        notFound();
    }

    return <ThirdPartyAuthPage provider={provider} mode="login" searchParams={searchParams} />;
}
