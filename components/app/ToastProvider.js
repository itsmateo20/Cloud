"use client";

import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import styles from './ToastProvider.module.css';

const ToastContext = createContext(null);
let idCounter = 0;

export function ToastProvider({ children, max = 5, duration = 4000 }) {
    const [toasts, setToasts] = useState([]);
    const queueRef = useRef([]);
    const [dmState, setDmState] = useState({ visible: false, expanded: false });

    const remove = useCallback((id) => {
        setToasts(t => t.filter(to => to.id !== id));
    }, []);

    const add = useCallback((toast) => {
        const id = ++idCounter;
        const entry = { id, created: Date.now(), type: toast.type || 'info', message: toast.message, action: toast.action };
        setToasts(prev => {
            const next = [...prev, entry];
            if (next.length > max) next.shift();
            return next;
        });
        return id;
    }, [max]);

    useEffect(() => {
        if (!toasts.length) return;
        const timers = toasts.map(t => setTimeout(() => remove(t.id), duration));
        return () => timers.forEach(clearTimeout);
    }, [toasts, duration, remove]);

    // Listen for download manager visibility to offset toasts so they don't overlap the button
    useEffect(() => {
        const handler = (e) => {
            if (e?.detail) setDmState(e.detail);
        };
        window.addEventListener('downloadManagerVisibility', handler);
        return () => window.removeEventListener('downloadManagerVisibility', handler);
    }, []);

    const contextValue = {
        addSuccess: (message, opts) => add({ message, type: 'success', ...opts }),
        addError: (message, opts) => add({ message, type: 'error', ...opts }),
        addInfo: (message, opts) => add({ message, type: 'info', ...opts }),
        addWarning: (message, opts) => add({ message, type: 'warning', ...opts }),
    };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <div className={`${styles.container} ${dmState.visible ? styles.withDownloadManager : ''} ${dmState.expanded ? styles.dmExpanded : ''}`} role="status" aria-live="polite" aria-atomic="false">
                {toasts.map(t => (
                    <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
                        <div className={styles.body}>{t.message}</div>
                        <button className={styles.close} onClick={() => remove(t.id)} aria-label="Close">×</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};
