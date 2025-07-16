// utils/useIsMobile.js

import { useEffect, useState } from "react";

export function useIsMobile() {
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

  return isMobile;
}