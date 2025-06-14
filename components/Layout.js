// components/app/AppLayout.js

import { Navigation } from "./navigation/Navigation";
import Loading from "./Loading";

export default function Layout({ children, loading, mobile, user }) {
    if (loading) return Loading();
    return (
        <main>
            <Navigation user={user} mobile={mobile} />
            {children}
        </main>
    );
}