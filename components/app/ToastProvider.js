"use client";

import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import styles from './ToastProvider.module.css';

const ToastContext = createContext(null);
let idCounter = 0;

export function ToastProvider({ children, max = 5, duration = 4000 }) {
    const [toasts, setToasts] = useState([]);
    const queueRef = useRef([]);
    const [dmState, setDmState] = useState({ visible: false, expanded: false });
    const [umState, setUmState] = useState({ visible: false, expanded: false });

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

    useEffect(() => {
        const downloadHandler = (e) => {
            if (e?.detail) setDmState(e.detail);
        };
        const uploadHandler = (e) => {
            if (e?.detail) setUmState(e.detail);
        };
        window.addEventListener('downloadManagerVisibility', downloadHandler);
        window.addEventListener('uploadManagerVisibility', uploadHandler);
        return () => {
            window.removeEventListener('downloadManagerVisibility', downloadHandler);
            window.removeEventListener('uploadManagerVisibility', uploadHandler);
        };
    }, []);

    const hasManager = dmState.visible || umState.visible;
    const hasExpandedManager = dmState.expanded || umState.expanded;
    const uploadRight = dmState.visible ? 92 : 20;
    const downloadRight = 20;

    let toastRight = 16;
    if (hasManager) {
        if (dmState.visible && umState.visible) toastRight = 164;
        else toastRight = 92;
    }
    if (hasExpandedManager) {
        if (dmState.expanded) toastRight = Math.max(toastRight, downloadRight + 320);
        if (umState.expanded) toastRight = Math.max(toastRight, uploadRight + 320);
    }

    const contextValue = {
        addSuccess: (message, opts) => add({ message, type: 'success', ...opts }),
        addError: (message, opts) => add({ message, type: 'error', ...opts }),
        addInfo: (message, opts) => add({ message, type: 'info', ...opts }),
        addWarning: (message, opts) => add({ message, type: 'warning', ...opts }),
    };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <div className={`${styles.container} ${hasManager ? styles.withManager : ''} ${hasExpandedManager ? styles.managerExpanded : ''}`} style={{ right: `${toastRight}px` }} role="status" aria-live="polite" aria-atomic="false">
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
