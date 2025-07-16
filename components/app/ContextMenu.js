// components/app/ContextMenu.js

import { useEffect, useRef, useState } from "react";
import styles from "./ContextMenu.module.css";

export function ContextMenu({
    x,
    y,
    isVisible,
    onClose,
    selectedItems,
    onAction,
    currentPath
}) {
    const menuRef = useRef(null);
    const [showFavoriteSubmenu, setShowFavoriteSubmenu] = useState(false);
    const selectedArray = Array.isArray(selectedItems)
        ? selectedItems
        : Array.from(selectedItems || []);

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

    const isMultipleSelected = selectedArray.length > 1;
    const selectedItem = selectedArray[0];
    const isFolder = selectedItem?.type === "folder";
    const isFavoritesPage = currentPath === 'favorites';
    const favoritedItems = selectedArray.filter(item => item.isFavorited);
    const unfavoritedItems = selectedArray.filter(item => !item.isFavorited);
    const hasMixedFavorites = isMultipleSelected && favoritedItems.length > 0 && unfavoritedItems.length > 0;
    const allFavorited = isMultipleSelected && favoritedItems.length === selectedArray.length;
    const shouldShowSubmenu = hasMixedFavorites || allFavorited;

    const handleAction = (action) => {
        onAction(action, selectedArray);
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className={styles.contextMenu}
            style={{ left: x, top: y }}
        >
            {isFavoritesPage ? (
                <>
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

                    <div className={styles.menuItem} onClick={() => handleAction("go-to-location")}>
                        <span className={styles.icon}>📍</span>
                        Take me to file location
                    </div>

                    <div className={styles.menuItem} onClick={() => handleAction("remove-favorite")}>
                        <span className={styles.icon}>💔</span>
                        Remove from Favorites{isMultipleSelected ? ` (${selectedItems.length})` : ""}
                    </div>

                    <div className={styles.separator}></div>

                    <div className={styles.menuItem} onClick={() => handleAction("properties")}>
                        <span className={styles.icon}>ℹ️</span>
                        Properties
                    </div>
                </>
            ) : (

                <>
                    <div className={styles.menuItem} onClick={() => handleAction("open")}>
                        <span className={styles.icon}>📂</span>
                        {isFolder ? "Open" : "Open"}
                    </div>

                    <div className={styles.menuItem} onClick={() => handleAction("download")}>
                        <span className={styles.icon}>⬇️</span>
                        {isFolder ? "Download as ZIP" : "Download"}{isMultipleSelected ? ` (${selectedItems.length})` : ""}
                    </div>

                    <div className={styles.separator}></div>

                    <div className={styles.menuItem} onClick={() => handleAction("rename")}>
                        <span className={styles.icon}>✏️</span>
                        Rename{isMultipleSelected ? ` (${selectedItems.length})` : ""}
                    </div>

                    {shouldShowSubmenu ? (
                        <div
                            className={`${styles.menuItem} ${styles.hasSubmenu}`}
                            onMouseEnter={() => setShowFavoriteSubmenu(true)}
                            onMouseLeave={() => setShowFavoriteSubmenu(false)}
                        >
                            <span className={styles.icon}>⭐</span>
                            Favorite Options
                            <span className={styles.arrow}>▶</span>

                            {showFavoriteSubmenu && (
                                <div className={styles.submenu}>
                                    <div className={styles.submenuItem} onClick={() => handleAction("add-favorite")}>
                                        <span className={styles.icon}>☆</span>
                                        Add Favorite
                                    </div>
                                    <div className={styles.submenuItem} onClick={() => handleAction("remove-favorite")}>
                                        <span className={styles.icon}>⭐</span>
                                        Remove Favorite
                                    </div>
                                    <div className={styles.submenuItem} onClick={() => handleAction("toggle-favorite")}>
                                        <span className={styles.icon}>🔄</span>
                                        Toggle Favorite
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.menuItem} onClick={() => handleAction("favorite")}>
                            <span className={styles.icon}>{selectedItem?.isFavorited ? "⭐" : "☆"}</span>
                            {isMultipleSelected ? "Toggle Favorites" : (selectedItem?.isFavorited ? "Remove from Favorites" : "Add to Favorites")}
                        </div>
                    )}

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
                </>
            )}
        </div>
    );
}