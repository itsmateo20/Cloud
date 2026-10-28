// app/login/github/page.js

import ThirdPartyAuthPage from "@/components/authentication/ThirdPartyAuthPage";

export default function Page({ searchParams }) {
    return <ThirdPartyAuthPage provider="github" mode="login" searchParams={searchParams} />;
}
