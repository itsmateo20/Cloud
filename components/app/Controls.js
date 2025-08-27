// components/app/Controls.js

import React, { useState, useRef, useEffect } from 'react';
import styles from './Controls.module.css';
import {
    Plus,
    FolderPlus,
    FileText,
    Edit3,
    Upload,
    Download,
    Trash2,
    ArrowUpDown,
    Eye,
    MoreHorizontal,
    Star,
    Settings,
    ChevronDown,
    Check,
    Calendar,
    FileIcon,
    Ruler,
    Image,
    Square,
    SquareDot,
    Grid3x3,
    List,
    BarChart3,
    LayoutGrid
} from 'lucide-react';

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
            if (newDropdownRef.current && !newDropdownRef.current.contains(event.target)) setShowNewDropdown(false);
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) setShowSortDropdown(false);
            if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target)) setShowViewDropdown(false);
            if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) setShowMoreDropdown(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const hasSelection = selectedArray.length > 0;
    const isSpecialPath = currentPath === 'favorites';

    const sortOptions = [
        { value: 'name', label: 'Name', icon: <Edit3 size={16} /> },
        { value: 'date', label: 'Date modified', icon: <Calendar size={16} /> },
        { value: 'type', label: 'Type', icon: <FileIcon size={16} /> },
        { value: 'size', label: 'Size', icon: <Ruler size={16} /> }
    ];

    const viewOptions = [
        { value: 'extraLargeIcons', label: 'Extra Large Icons', icon: <Image size={16} /> },
        { value: 'largeIcons', label: 'Large Icons', icon: <Square size={16} /> },
        { value: 'mediumIcons', label: 'Medium Icons', icon: <SquareDot size={16} /> },
        { value: 'smallIcons', label: 'Small Icons', icon: <Grid3x3 size={16} /> },
        { value: 'list', label: 'List', icon: <List size={16} /> },
        { value: 'details', label: 'Details', icon: <BarChart3 size={16} /> },
        { value: 'tiles', label: 'Tiles', icon: <LayoutGrid size={16} /> }
    ];

    return (
        <div className={styles.controls}>
            <div className={styles.section}>
                <div className={styles.dropdown} ref={newDropdownRef}>
                    <button
                        className={`${styles.button} ${styles.newButton}`}
                        onClick={() => setShowNewDropdown(!showNewDropdown)}
                        disabled={isSpecialPath}
                        title="New"
                    >
                        <span className={styles.icon}><Plus size={16} /></span>
                        <span className={styles.label}>New</span>
                        <span className={styles.arrow}><ChevronDown size={12} /></span>
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
                                <span className={styles.dropdownIcon}><FolderPlus size={16} /></span>
                                Folder
                            </button>
                            <button
                                className={styles.dropdownItem}
                                onClick={() => {
                                    onNewFile();
                                    setShowNewDropdown(false);
                                }}
                            >
                                <span className={styles.dropdownIcon}><FileIcon size={16} /></span>
                                File
                            </button>
                            <button
                                className={styles.dropdownItem}
                                onClick={() => {
                                    onNewTextFile();
                                    setShowNewDropdown(false);
                                }}
                            >
                                <span className={styles.dropdownIcon}><FileText size={16} /></span>
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
                    <span className={styles.icon}><Upload size={16} /></span>
                    <span className={styles.label}>Upload</span>
                </button>

                <button
                    className={`${styles.button} ${!hasSelection ? styles.disabled : ''}`}
                    onClick={onDownload}
                    disabled={!hasSelection}
                    title="Download selected files and folders (folders as ZIP)"
                >
                    <span className={styles.icon}><Download size={16} /></span>
                    <span className={styles.label}>Download</span>
                </button>
            </div>

            <div className={styles.separator}></div>

            <div className={styles.section}>
                <button
                    className={`${styles.button} ${!hasSelection ? styles.disabled : ''}`}
                    onClick={onDelete}
                    disabled={!hasSelection || isSpecialPath}
                    title="Delete"
                >
                    <span className={styles.icon}><Trash2 size={16} /></span>
                    <span className={styles.label}>Delete</span>
                </button>

                <button
                    className={`${styles.button} ${!hasSelection ? styles.disabled : ''}`}
                    onClick={onRename}
                    disabled={!hasSelection || selectedArray.length !== 1}
                    title="Rename"
                >
                    <span className={styles.icon}><Edit3 size={16} /></span>
                    <span className={styles.label}>Rename</span>
                </button>
            </div>

            <div className={styles.separator}></div>

            <div className={styles.section}>
                <div className={styles.dropdown} ref={sortDropdownRef}>
                    <button
                        className={styles.button}
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        title="Sort"
                    >
                        <span className={styles.icon}><ArrowUpDown size={16} /></span>
                        <span className={styles.label}>Sort</span>
                        <span className={styles.arrow}><ChevronDown size={12} /></span>
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
                                    {sortBy === option.value && <span className={styles.checkmark}><Check size={16} /></span>}
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
                        <span className={styles.icon}><Eye size={16} /></span>
                        <span className={styles.label}>View</span>
                        <span className={styles.arrow}><ChevronDown size={12} /></span>
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
                                    {viewMode === option.value && <span className={styles.checkmark}><Check size={16} /></span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.separator}></div>

            <div className={styles.section}>
                <div className={styles.dropdown} ref={moreDropdownRef}>
                    <button
                        className={styles.button}
                        onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                        title="More"
                    >
                        <span className={styles.icon}><MoreHorizontal size={16} /></span>
                        <span className={styles.label}>More</span>
                        <span className={styles.arrow}><ChevronDown size={12} /></span>
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
                                <span className={styles.dropdownIcon}><Star size={16} /></span>
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
                                <span className={styles.dropdownIcon}><Settings size={16} /></span>
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
