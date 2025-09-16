import React, { useEffect, useCallback, useState } from 'react';
import styles from './ConfirmModal.module.css';

/**
 * Reusable confirmation modal.
 * Props:
 *  - open: boolean
 *  - title: string
 *  - message: string (supports \n for new lines)
 *  - variant: 'default' | 'danger'
 *  - confirmLabel: string
 *  - cancelLabel: string
 *  - onConfirm: () => void
 *  - onCancel: () => void
 *  - destructive: boolean (styles confirm button as danger)
 *  - extraActions?: React.ReactNode (optional extra action buttons left side)
 */
export function ConfirmModal({
    open,
    title = 'Confirm Action',
    message = 'Are you sure?',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    destructive = false,
    extraActions = null
}) {
    // Local visibility state to allow exit animation
    const [visible, setVisible] = useState(open);
    const [closing, setClosing] = useState(false);

    // Watch open prop to trigger mount/unmount with animation
    useEffect(() => {
        if (open) {
            setVisible(true);
            setClosing(false);
        } else if (visible) {
            // start closing animation
            setClosing(true);
            const t = setTimeout(() => { setVisible(false); setClosing(false); }, 180); // match CSS duration
            return () => clearTimeout(t);
        }
    }, [open, visible]);

    const escHandler = useCallback((e) => {
        if (!(open || closing)) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            onCancel?.();
        }
    }, [open, closing, onCancel]);

    useEffect(() => {
        if (open && visible) {
            document.addEventListener('keydown', escHandler);
            document.body.style.overflow = 'hidden';
            return () => {
                document.removeEventListener('keydown', escHandler);
                document.body.style.overflow = '';
            };
        }
        if (closing) {
            // keep body scroll locked until animation finishes
            document.body.style.overflow = 'hidden';
            const t = setTimeout(() => { document.body.style.overflow = ''; }, 180);
            return () => clearTimeout(t);
        }
    }, [open, visible, closing, escHandler]);

    if (!visible) return null;

    return (
        <div className={`${styles.backdrop} ${closing ? styles.backdropClosing : ''}`} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
            <div className={`${styles.modal} ${closing ? styles.modalClosing : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 id="confirm-modal-title" className={styles.title}>{title}</h3>
                </div>
                <div className={styles.body}>{message}</div>
                <div className={styles.actions}>
                    {extraActions}
                    <button className={`${styles.button} ${styles.outline}`} onClick={onCancel}>{cancelLabel}</button>
                    <button
                        className={`${styles.button} ${destructive ? styles.danger : styles.primary}`}
                        onClick={onConfirm}
                        autoFocus
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;