// utils/useIsMobile.js
"use client";

import { useState, useEffect } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const detectMobile = () => {
        // Primary check: User agent for actual mobile devices
        const userAgent = navigator.userAgent;
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i;
        const isMobileUA = mobileRegex.test(userAgent);

        // Secondary check: Touch capability combined with small screen
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isVerySmallScreen = window.matchMedia("(max-width: 768px)").matches; // More strict threshold

        // Exclude tablets and desktop touch screens
        const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(userAgent);
        const isLargeScreen = window.matchMedia("(min-width: 1024px)").matches;

        // Only consider mobile if:
        // 1. Has mobile user agent OR
        // 2. Has touch AND very small screen AND not a tablet AND not large screen
        const isMobileDevice = isMobileUA || (hasTouch && isVerySmallScreen && !isTablet && !isLargeScreen);

        return isMobileDevice;
      };

      setIsMobile(detectMobile());

      // Listen for orientation changes (mobile-specific)
      const handleOrientationChange = () => {
        // Small delay to allow for layout changes
        setTimeout(() => setIsMobile(detectMobile()), 100);
      };

      // Listen for resize events
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