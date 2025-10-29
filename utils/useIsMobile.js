// utils/useIsMobile.js
"use client";

import { useState, useEffect } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const detectMobile = () => {

        const userAgent = navigator.userAgent;
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i;
        const isMobileUA = mobileRegex.test(userAgent);

        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isVerySmallScreen = window.matchMedia("(max-width: 768px)").matches;

        const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(userAgent);
        const isLargeScreen = window.matchMedia("(min-width: 1024px)").matches;

        const isMobileDevice = isMobileUA || (hasTouch && isVerySmallScreen && !isTablet && !isLargeScreen);

        return isMobileDevice;
      };

      setIsMobile(detectMobile());

      const handleOrientationChange = () => {

        setTimeout(() => setIsMobile(detectMobile()), 100);
      };

      const handleResize = () => {
        setIsMobile(detectMobile());
      };

      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", handleOrientationChange);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleOrientationChange);
      };
    }
  }, []);

  return isMobile;
}