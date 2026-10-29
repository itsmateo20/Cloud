// app/signup/[provider]/page.js

import ThirdPartyAuthPage from "@/components/authentication/ThirdPartyAuthPage";
import { notFound } from "next/navigation";

export default async function Page({ params, searchParams }) {
    const { provider } = await params;

    if (!["google", "github", "discord"].includes(provider)) return notFound();

    return <ThirdPartyAuthPage provider={provider} mode="signup" searchParams={searchParams} />;
}
