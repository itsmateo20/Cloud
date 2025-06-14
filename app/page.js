// app/page.js
"use client";

import { useAuth } from "@/context/AuthProvider";
import Layout from "@/components/Layout";
import main from "@/public/styles/main.module.css";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";

export default function Page() {
  const { user, loading, signout } = useAuth();

  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      let mobile = window.matchMedia("(max-width: 1023px)");
      setIsMobile(mobile.matches);

      const handleResize = () => setIsMobile(window.matchMedia("(max-width: 1023px)").matches);
      window.addEventListener("resize", handleResize);

      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  return (
    <Layout loading={loading} mobile={isMobile} user={user}>
      <main className={main.main}>
        <h1>Hello world</h1>
        <p>Witaj {user?.email || "nieznajomy"}!</p>
        <p>{user ? `${JSON.stringify(user, null, 2)}` : "No user data"}</p>
        <button type="button" onClick={() => signout()}><span>Wyloguj się</span></button>
      </main>
    </Layout>
  )
}
