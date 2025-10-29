// components/Loading.js

import { useEffect, useState } from "react";
import style from "@/public/styles/loading.module.css";
import { Loader2 } from "lucide-react";

export default function Loading({ fadeOut = false }) {
    const [currentTheme, setCurrentTheme] = useState('dark');
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Detect current theme
        const detectTheme = () => {
            if (typeof window !== 'undefined') {
                const html = document.documentElement;
                const theme = html.getAttribute('data-theme');

                if (theme === 'light' || theme === 'high-contrast') {
                    setCurrentTheme('light');
                } else if (theme === 'dark') {
                    setCurrentTheme('dark');
                } else {
                    // Device theme - detect system preference
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    setCurrentTheme(prefersDark ? 'dark' : 'light');
                }
            }
        };

        detectTheme();

        // Listen for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    detectTheme();
                }
            });
        });

        if (typeof window !== 'undefined') {
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme']
            });
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (fadeOut) {
            // Start fade out after a brief delay
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [fadeOut]);

    const getLoadingClasses = () => {
        let classes = style.loading;

        if (fadeOut || !isVisible) {
            // Only apply fade out when fadeOut is true
            classes += ` ${style.fadeOut}`;
            if (currentTheme === 'light') {
                classes += ` ${style.lightFade}`;
            } else {
                classes += ` ${style.darkFade}`;
            }
        }
        // Remove fade-in logic - loading screen should start normally visible

        return classes;
    };

    return (
        <div className={getLoadingClasses()}>
            <h1><Loader2 size={20} /> Loading...</h1>
        </div>
    );
}