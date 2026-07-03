// components/app/ConfirmModal.js

"use client";

import React, { useEffect, useCallback, useState } from 'react';
import styles from './ConfirmModal.module.css';

export function ConfirmModal({
    open,
    isOpen,
    title = 'Confirm Action',
    message = 'Are you sure?',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    destructive,
    isDestructive,
    isLoading = false,
    confirmDisabled = false,
    extraActions = null,
    children = null,
    onClose
}) {
    const resolvedOpen = open ?? isOpen ?? false;
    const resolvedOnCancel = onCancel ?? onClose;
    const resolvedDestructive = destructive ?? isDestructive ?? false;
    const body = children ?? message;

    const [visible, setVisible] = useState(resolvedOpen);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (resolvedOpen) {
            setVisible(true);
            setClosing(false);
        } else if (visible) {
            setClosing(true);
            const t = setTimeout(() => { setVisible(false); setClosing(false); }, 180);
            return () => clearTimeout(t);
        }
    }, [resolvedOpen, visible]);

    const escHandler = useCallback((e) => {
        if (!(resolvedOpen || closing)) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            resolvedOnCancel?.();
        }
    }, [resolvedOpen, closing, resolvedOnCancel]);

    useEffect(() => {
        if (resolvedOpen && visible) {
            document.addEventListener('keydown', escHandler);
            document.body.style.overflow = 'hidden';
            return () => {
                document.removeEventListener('keydown', escHandler);
                document.body.style.overflow = '';
            };
        }
        if (closing) {
            document.body.style.overflow = 'hidden';
            const t = setTimeout(() => { document.body.style.overflow = ''; }, 180);
            return () => clearTimeout(t);
        }
    }, [resolvedOpen, visible, closing, escHandler]);

    if (!visible) return null;

    return (
        <div className={`${styles.backdrop} ${closing ? styles.backdropClosing : ''}`} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" onMouseDown={(e) => { if (e.target === e.currentTarget) resolvedOnCancel?.(); }}>
            <div className={`${styles.modal} ${closing ? styles.modalClosing : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 id="confirm-modal-title" className={styles.title}>{title}</h3>
                </div>
                <div className={styles.body}>{body}</div>
                <div className={styles.actions}>
                    {extraActions}
                    <button className={`${styles.button} ${styles.outline}`} onClick={resolvedOnCancel}>{cancelLabel}</button>
                    <button
                        className={`${styles.button} ${resolvedDestructive ? styles.danger : styles.primary}`}
                        onClick={onConfirm}
                        autoFocus={!isLoading}
                        disabled={isLoading || confirmDisabled}
                    >
                        {isLoading ? 'Working...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;