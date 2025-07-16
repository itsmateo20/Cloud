// components/app/Controls.js

import React, { useState, useRef, useEffect } from 'react';
import styles from './Controls.module.css';

const Controls = ({
    currentPath,
    selectedItems = [],
    onNewFolder,
    onNewFile,
    onNewTextFile,
    onUpload,
    onDownload,
    onDelete,
    onRename,
    onFavorite,
    onProperties,
    sortBy,
    onSortChange,
    viewMode,
    onViewChange
}) => {
    const selectedArray = Array.isArray(selectedItems)
        ? selectedItems
        : Array.from(selectedItems || []);
    const [showNewDropdown, setShowNewDropdown] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showViewDropdown, setShowViewDropdown] = useState(false);
    const [showMoreDropdown, setShowMoreDropdown] = useState(false);

    const newDropdownRef = useRef(null);
    const sortDropdownRef = useRef(null);
    const viewDropdownRef = useRef(null);
    const moreDropdownRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (newDropdownRef.current && !newDropdownRef.current.contains(event.target)) {
                setShowNewDropdown(false);
            }
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
                setShowSortDropdown(false);
            }
            if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target)) {
                setShowViewDropdown(false);
            }
            if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
                setShowMoreDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const hasSelection = selectedArray.length > 0;
    const isSpecialPath = currentPath === 'favorites';

    const sortOptions = [
        { value: 'name', label: 'Name', icon: '📝' },
        { value: 'date', label: 'Date modified', icon: '📅' },
        { value: 'type', label: 'Type', icon: '📄' },
        { value: 'size', label: 'Size', icon: '📏' }
    ];

    const viewOptions = [
        { value: 'extraLargeIcons', label: 'Extra Large Icons', icon: '🖼️' },
        { value: 'largeIcons', label: 'Large Icons', icon: '⬜' },
        { value: 'mediumIcons', label: 'Medium Icons', icon: '▫️' },
        { value: 'smallIcons', label: 'Small Icons', icon: '🔳' },
        { value: 'list', label: 'List', icon: '📋' },
        { value: 'details', label: 'Details', icon: '📊' },
        { value: 'tiles', label: 'Tiles', icon: '🧱' }
    ];

    return (
        <div className={styles.controls}>
            {/* New Section */}
            <div className={styles.section}>
                <div className={styles.dropdown} ref={newDropdownRef}>
                    <button
                        className={`${styles.button} ${styles.newButton}`}
                        onClick={() => setShowNewDropdown(!showNewDropdown)}
                        disabled={isSpecialPath}
                        title="New"
                    >
                        <span className={styles.icon}>➕</span>
                        <span className={styles.label}>New</span>
                        <span className={styles.arrow}>▼</span>
                    </button>
                    {showNewDropdown && !isSpecialPath && (
                        <div className={styles.dropdownMenu}>
                            <button
                                className={styles.dropdownItem}
                                onClick={() => {
                                    onNewFolder();
                                    setShowNewDropdown(false);
                                }}
                            >
                                <span className={styles.dropdownIcon}>📁</span>
                                Folder
                            </button>
                            <button
                                className={styles.dropdownItem}
                                onClick={() => {
                                    onNewFile();
                                    setShowNewDropdown(false);
                                }}
                            >
                                <span className={styles.dropdownIcon}>📄</span>
                                File
                            </button>
                            <button
                                className={styles.dropdownItem}
                                onClick={() => {
                                    onNewTextFile();
                                    setShowNewDropdown(false);
                                }}
                            >
                                <span className={styles.dropdownIcon}>📝</span>
                                Text Document
                            </button>
                        </div>
                    )}
                </div>

                <button
                    className={styles.button}
                    onClick={onUpload}
                    disabled={isSpecialPath}
                    title="Upload"
                >
                    <span className={styles.icon}>📤</span>
                    <span className={styles.label}>Upload</span>
                </button>

                <button
                    className={`${styles.button} ${!hasSelection ? styles.disabled : ''}`}
                    onClick={onDownload}
                    disabled={!hasSelection}
                    title="Download selected files and folders (folders as ZIP)"
                >
                    <span className={styles.icon}>📥</span>
                    <span className={styles.label}>Download</span>
                </button>
            </div>

            <div className={styles.separator}></div>

            {/* File Operations Section */}
            <div className={styles.section}>
                <button
                    className={`${styles.button} ${!hasSelection ? styles.disabled : ''}`}
                    onClick={onDelete}
                    disabled={!hasSelection || isSpecialPath}
                    title="Delete"
                >
                    <span className={styles.icon}>🗑️</span>
                    <span className={styles.label}>Delete</span>
                </button>

                <button
                    className={`${styles.button} ${!hasSelection ? styles.disabled : ''}`}
                    onClick={onRename}
                    disabled={!hasSelection || selectedArray.length !== 1}
                    title="Rename"
                >
                    <span className={styles.icon}>✏️</span>
                    <span className={styles.label}>Rename</span>
                </button>
            </div>

            <div className={styles.separator}></div>

            {/* View Section */}
            <div className={styles.section}>
                <div className={styles.dropdown} ref={sortDropdownRef}>
                    <button
                        className={styles.button}
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        title="Sort"
                    >
                        <span className={styles.icon}>🔀</span>
                        <span className={styles.label}>Sort</span>
                        <span className={styles.arrow}>▼</span>
                    </button>
                    {showSortDropdown && (
                        <div className={styles.dropdownMenu}>
                            {sortOptions.map((option) => (
                                <button
                                    key={option.value}
                                    className={`${styles.dropdownItem} ${sortBy === option.value ? styles.active : ''}`}
                                    onClick={() => {
                                        onSortChange(option.value);
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    <span className={styles.dropdownIcon}>{option.icon}</span>
                                    {option.label}
                                    {sortBy === option.value && <span className={styles.checkmark}>✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.dropdown} ref={viewDropdownRef}>
                    <button
                        className={styles.button}
                        onClick={() => setShowViewDropdown(!showViewDropdown)}
                        title="View"
                    >
                        <span className={styles.icon}>👁️</span>
                        <span className={styles.label}>View</span>
                        <span className={styles.arrow}>▼</span>
                    </button>
                    {showViewDropdown && (
                        <div className={styles.dropdownMenu}>
                            {viewOptions.map((option) => (
                                <button
                                    key={option.value}
                                    className={`${styles.dropdownItem} ${viewMode === option.value ? styles.active : ''}`}
                                    onClick={() => {
                                        onViewChange(option.value);
                                        setShowViewDropdown(false);
                                    }}
                                >
                                    <span className={styles.dropdownIcon}>{option.icon}</span>
                                    {option.label}
                                    {viewMode === option.value && <span className={styles.checkmark}>✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.separator}></div>

            {/* More Section */}
            <div className={styles.section}>
                <div className={styles.dropdown} ref={moreDropdownRef}>
                    <button
                        className={styles.button}
                        onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                        title="More"
                    >
                        <span className={styles.icon}>⋯</span>
                        <span className={styles.label}>More</span>
                        <span className={styles.arrow}>▼</span>
                    </button>
                    {showMoreDropdown && (
                        <div className={styles.dropdownMenu}>
                            <button
                                className={`${styles.dropdownItem} ${!hasSelection ? styles.disabled : ''}`}
                                onClick={() => {
                                    onFavorite();
                                    setShowMoreDropdown(false);
                                }}
                                disabled={!hasSelection || isSpecialPath}
                            >
                                <span className={styles.dropdownIcon}>⭐</span>
                                Favorite
                            </button>
                            <button
                                className={`${styles.dropdownItem} ${!hasSelection ? styles.disabled : ''}`}
                                onClick={() => {
                                    onProperties();
                                    setShowMoreDropdown(false);
                                }}
                                disabled={!hasSelection}
                            >
                                <span className={styles.dropdownIcon}>⚙️</span>
                                Properties
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Controls;
