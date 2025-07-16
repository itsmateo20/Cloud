// components/app/AppLayout.js

import { Navigation } from "./navigation/Navigation";
import Loading from "./Loading";

export default function Layout({ children, mainStyle, loading, user = null }) {
    if (loading) return Loading();

    return (
        <main className={mainStyle}>
            <Navigation user={user} />
            {children}
        </main>
    );
}