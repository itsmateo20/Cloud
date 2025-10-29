// components/Loading.js

import { useEffect, useState } from "react";
import style from "@/public/styles/loading.module.css";
import { Loader2 } from "lucide-react";

export default function Loading({ fadeOut = false }) {
    const [currentTheme, setCurrentTheme] = useState('dark');
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {

        const detectTheme = () => {
            if (typeof window !== 'undefined') {
                const html = document.documentElement;
                const theme = html.getAttribute('data-theme');

                if (theme === 'light' || theme === 'high-contrast') {
                    setCurrentTheme('light');
                } else if (theme === 'dark') {
                    setCurrentTheme('dark');
                } else {

                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    setCurrentTheme(prefersDark ? 'dark' : 'light');
                }
            }
        };

        detectTheme();

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

            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [fadeOut]);

    const getLoadingClasses = () => {
        let classes = style.loading;

        if (fadeOut || !isVisible) {

            classes += ` ${style.fadeOut}`;
            if (currentTheme === 'light') {
                classes += ` ${style.lightFade}`;
            } else {
                classes += ` ${style.darkFade}`;
            }
        }

        return classes;
    };

    return (
        <div className={getLoadingClasses()}>
            <h1><Loader2 size={20} /> Loading...</h1>
        </div>
    );
}