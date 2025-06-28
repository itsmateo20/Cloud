// components/app/ContextMenu.js

import { useEffect, useRef } from "react";
import styles from "./ContextMenu.module.css";

export function ContextMenu({
    x,
    y,
    isVisible,
    onClose,
    selectedItems,
    onAction
}) {
    const menuRef = useRef(null);

    useEffect(() => {
        if (!isVisible) return;

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isVisible, onClose]);

    useEffect(() => {
        if (isVisible && menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (x + rect.width > viewportWidth) {
                menuRef.current.style.left = `${viewportWidth - rect.width - 10}px`;
            }

            if (y + rect.height > viewportHeight) {
                menuRef.current.style.top = `${viewportHeight - rect.height - 10}px`;
            }
        }
    }, [isVisible, x, y]);

    if (!isVisible) return null;

    const isMultipleSelected = selectedItems.length > 1;
    const selectedItem = selectedItems[0];
    const isFolder = selectedItem?.type === "folder";

    const handleAction = (action) => {
        onAction(action, selectedItems);
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className={styles.contextMenu}
            style={{ left: x, top: y }}
        >
            <div className={styles.menuItem} onClick={() => handleAction("open")}>
                <span className={styles.icon}>📂</span>
                {isFolder ? "Open" : "Open"}
            </div>

            {!isFolder && (
                <div className={styles.menuItem} onClick={() => handleAction("download")}>
                    <span className={styles.icon}>⬇️</span>
                    Download{isMultipleSelected ? ` (${selectedItems.length})` : ""}
                </div>
            )}

            <div className={styles.separator}></div>

            <div className={styles.menuItem} onClick={() => handleAction("cut")}>
                <span className={styles.icon}>✂️</span>
                Cut
            </div>

            <div className={styles.menuItem} onClick={() => handleAction("copy")}>
                <span className={styles.icon}>📋</span>
                Copy
            </div>

            <div className={styles.separator}></div>

            <div className={styles.menuItem} onClick={() => handleAction("rename")}>
                <span className={styles.icon}>✏️</span>
                Rename
            </div>

            <div className={styles.menuItem} onClick={() => handleAction("favorite")}>
                <span className={styles.icon}>⭐</span>
                Add to Favorites
            </div>

            <div className={styles.menuItem} onClick={() => handleAction("share")}>
                <span className={styles.icon}>🔗</span>
                Share
            </div>

            <div className={styles.separator}></div>

            <div className={styles.menuItem} onClick={() => handleAction("properties")}>
                <span className={styles.icon}>ℹ️</span>
                Properties
            </div>

            <div className={styles.separator}></div>

            <div
                className={`${styles.menuItem} ${styles.danger}`}
                onClick={() => handleAction("delete")}
            >
                <span className={styles.icon}>🗑️</span>
                Delete{isMultipleSelected ? ` (${selectedItems.length})` : ""}
            </div>
        </div>
    );
}