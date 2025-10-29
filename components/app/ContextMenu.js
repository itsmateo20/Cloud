// components/app/ContextMenu.js
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ContextMenu.module.css";
import {
    FolderOpen,
    Download,
    Smartphone,
    MapPin,
    HeartOff,
    Info,
    Upload,
    Edit3,
    Star,
    StarOff,
    RotateCcw,
    Trash2,
    ChevronRight
} from 'lucide-react';

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
    const [showQrSubmenu, setShowQrSubmenu] = useState(false);
    const selectedArray = Array.isArray(selectedItems)
        ? selectedItems
        : Array.from(selectedItems || []);

    useEffect(() => {
        if (!isVisible) return;

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) onClose();
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose();
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

            if (x + rect.width > viewportWidth) menuRef.current.style.left = `${viewportWidth - rect.width - 10}px`;

            if (y + rect.height > viewportHeight) menuRef.current.style.top = `${viewportHeight - rect.height - 10}px`;
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

    const handleSubmenuAction = (action) => {
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
                        <span className={styles.icon}><FolderOpen size={16} /></span>
                        {isFolder ? "Open" : "Open"}
                    </div>

                    <div className={styles.menuItem} onClick={() => handleAction("download")}>
                        <span className={styles.icon}><Download size={16} /></span>
                        Download{isMultipleSelected ? ` (${selectedItems.length})` : ""}
                    </div>

                    <div className={styles.menuItem} onClick={() => handleSubmenuAction("download-qr")}>
                        <span className={styles.icon}><Smartphone size={16} /></span>
                        Download file{isMultipleSelected ? `s` : ""} via QR Code {isMultipleSelected ? ` (${selectedItems.length})` : ""}
                    </div>

                    <div className={styles.separator}></div>

                    <div className={styles.menuItem} onClick={() => handleAction("go-to-location")}>
                        <span className={styles.icon}><MapPin size={16} /></span>
                        Take me to file location
                    </div>

                    <div className={styles.menuItem} onClick={() => handleAction("remove-favorite")}>
                        <span className={styles.icon}><HeartOff size={16} /></span>
                        Remove from Favorites{isMultipleSelected ? ` (${selectedItems.length})` : ""}
                    </div>

                    <div className={styles.separator}></div>

                    <div className={styles.menuItem} onClick={() => handleAction("properties")}>
                        <span className={styles.icon}><Info size={16} /></span>
                        Properties
                    </div>
                </>
            ) : (

                <>
                    <div className={styles.menuItem} onClick={() => handleAction("open")}>
                        <span className={styles.icon}><FolderOpen size={16} /></span>
                        {isFolder ? "Open" : "Open"}
                    </div>

                    <div className={styles.menuItem} onClick={() => handleAction("download")}>
                        <span className={styles.icon}><Download size={16} /></span>
                        {isFolder ? "Download as ZIP" : "Download"}{isMultipleSelected ? ` (${selectedItems.length})` : ""}
                    </div>

                    <div
                        className={`${styles.menuItem} ${styles.hasSubmenu}`}
                        onMouseEnter={() => setShowQrSubmenu(true)}
                        onMouseLeave={() => setShowQrSubmenu(false)}
                    >
                        <span className={styles.icon}><Smartphone size={16} /></span>
                        QR Code
                        <span className={styles.arrow}><ChevronRight size={12} /></span>

                        {showQrSubmenu && (
                            <div className={styles.submenu}>
                                <div className={styles.submenuItem} onClick={() => handleSubmenuAction("download-qr")}>
                                    <span className={styles.icon}><Smartphone size={16} /></span>
                                    Download file{isMultipleSelected ? `s` : ""} via QR Code {isMultipleSelected ? ` (${selectedItems.length})` : ""}
                                </div>
                                <div className={styles.submenuItem} onClick={() => handleSubmenuAction("upload-qr")}>
                                    <span className={styles.icon}><Upload size={16} /></span>
                                    Upload files via QR Code
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.separator}></div>

                    <div className={styles.menuItem} onClick={() => handleAction("rename")}>
                        <span className={styles.icon}><Edit3 size={16} /></span>
                        Rename{isMultipleSelected ? ` (${selectedItems.length})` : ""}
                    </div>

                    {shouldShowSubmenu ? (
                        <div
                            className={`${styles.menuItem} ${styles.hasSubmenu}`}
                            onMouseEnter={() => setShowFavoriteSubmenu(true)}
                            onMouseLeave={() => setShowFavoriteSubmenu(false)}
                        >
                            <span className={styles.icon}><Star size={16} /></span>
                            Favorite Options
                            <span className={styles.arrow}><ChevronRight size={12} /></span>

                            {showFavoriteSubmenu && (
                                <div className={styles.submenu}>
                                    <div className={styles.submenuItem} onClick={() => handleSubmenuAction("add-favorite")}>
                                        <span className={styles.icon}><StarOff size={16} /></span>
                                        Add Favorite
                                    </div>
                                    <div className={styles.submenuItem} onClick={() => handleSubmenuAction("remove-favorite")}>
                                        <span className={styles.icon}><Star size={16} /></span>
                                        Remove Favorite
                                    </div>
                                    <div className={styles.submenuItem} onClick={() => handleSubmenuAction("toggle-favorite")}>
                                        <span className={styles.icon}><RotateCcw size={16} /></span>
                                        Toggle Favorite
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.menuItem} onClick={() => handleAction("favorite")}>
                            <span className={styles.icon}>{selectedItem?.isFavorited ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}</span>
                            {isMultipleSelected ? "Toggle Favorites" : (selectedItem?.isFavorited ? "Remove from Favorites" : "Add to Favorites")}
                        </div>
                    )}

                    <div className={styles.separator}></div>

                    <div className={styles.menuItem} onClick={() => handleAction("properties")}>
                        <span className={styles.icon}><Info size={16} /></span>
                        Properties
                    </div>

                    <div className={styles.separator}></div>

                    <div
                        className={`${styles.menuItem} ${styles.danger}`}
                        onClick={() => handleAction("delete")}
                    >
                        <span className={styles.icon}><Trash2 size={16} /></span>
                        Delete{isMultipleSelected ? ` (${selectedItems.length})` : ""}
                    </div>
                </>
            )}
        </div>
    );
}