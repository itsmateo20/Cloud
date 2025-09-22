"use client";

import React, { useEffect, useCallback, useState } from 'react';
import styles from './FilePropertiesModal.module.css';
import { X, Copy, Star } from 'lucide-react';

function formatSize(size) {
    if (size == null) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function FilePropertiesModal({ open, items = [], onClose }) {
    const [visible, setVisible] = useState(open);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (open) {
            setVisible(true);
            setClosing(false);
        } else if (visible) {
            setClosing(true);
            const t = setTimeout(() => { setVisible(false); setClosing(false); }, 160);
            return () => clearTimeout(t);
        }
    }, [open, visible]);

    const escHandler = useCallback((e) => { if ((open || closing) && e.key === 'Escape') onClose?.(); }, [open, closing, onClose]);
    useEffect(() => {
        if (open && visible) {
            document.addEventListener('keydown', escHandler);
            document.body.style.overflow = 'hidden';
            return () => { document.removeEventListener('keydown', escHandler); document.body.style.overflow = ''; };
        }
        if (closing) {
            document.body.style.overflow = 'hidden';
            const t = setTimeout(() => { document.body.style.overflow = ''; }, 160);
            return () => clearTimeout(t);
        }
    }, [open, visible, closing, escHandler]);

    if (!visible || !items.length) return null;

    const first = items[0];
    const multiple = items.length > 1;
    const totalSize = items.reduce((acc, it) => acc + (it.size || 0), 0);
    const distinctTypes = [...new Set(items.map(it => it.type || (it.isDirectory ? 'Folder' : 'File')))].slice(0, 6);

    const copy = (text) => navigator.clipboard?.writeText(text).catch(() => { });

    const dateString = (ts) => ts ? new Date(ts).toLocaleString() : '—';

    return (
        <div className={`${styles.backdrop} ${closing ? styles.backdropClosing : ''}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
            <div className={`${styles.modal} ${closing ? styles.modalClosing : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>{multiple ? `${items.length} items selected` : first.name}</h3>
                    <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
                </div>
                <div className={styles.body}>
                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>General</div>
                        <div className={styles.kv}><div className={styles.kvLabel}>Name</div><div className={styles.kvValue}>{multiple ? '— (multiple)' : first.name} {!multiple && first.isFavorited && <Star size={14} className={styles.favoriteStar} />}</div><button className={styles.copyBtn} onClick={() => !multiple && copy(first.name)}><Copy size={14} /></button></div>
                        <div className={styles.kv}><div className={styles.kvLabel}>Type</div><div className={styles.kvValue}>{multiple ? `${distinctTypes.length} types` : first.type || (first.isDirectory ? 'Folder' : 'File')}</div></div>
                        <div className={styles.kv}><div className={styles.kvLabel}>Path</div><div className={styles.kvValue}>{multiple ? '— (multiple)' : first.path}</div>{!multiple && <button className={styles.copyBtn} onClick={() => copy(first.path)}><Copy size={14} /></button>}</div>
                        <div className={styles.kv}><div className={styles.kvLabel}>Size</div><div className={styles.kvValue}>{multiple ? formatSize(totalSize) : formatSize(first.size)}</div></div>
                        {!multiple && <div className={styles.kv}><div className={styles.kvLabel}>Modified</div><div className={styles.kvValue}>{dateString(first.modified || first.modifiedAt || first.updatedAt || first.createdAt)}</div></div>}
                        {multiple && <div className={styles.kv}><div className={styles.kvLabel}>Modified</div><div className={styles.kvValue}>— (varies)</div></div>}
                    </div>
                    {multiple && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Multiple Selection</div>
                            <div className={styles.kv}><div className={styles.kvLabel}>Items</div><div className={styles.kvValue}>{items.length}</div></div>
                            <div className={styles.kv}><div className={styles.kvLabel}>Types</div><div className={styles.kvValue}><div className={styles.inlineBadges}>{distinctTypes.map(t => <span key={t} className={styles.badge}>{t}</span>)}</div></div></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
