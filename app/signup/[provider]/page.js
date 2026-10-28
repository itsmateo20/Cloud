// app/signup/[provider]/page.js

import ThirdPartyAuthPage from "@/components/authentication/ThirdPartyAuthPage";

export default async function Page({ params, searchParams }) {
    const { provider } = await params;

    if (!["google", "github"].includes(provider)) {
        return <div>Provider not found</div>;
    }

    return <ThirdPartyAuthPage provider={provider} mode="signup" searchParams={searchParams} />;
}
