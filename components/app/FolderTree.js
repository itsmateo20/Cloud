// components/app/FolderTree.js

import { useEffect, useState } from "react";
import styles from "./FolderTree.module.css";

export function FolderTree({ onFolderSelect, selectedPath }) {
    const [rootFolders, setRootFolders] = useState([]);
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [folderContents, setFolderContents] = useState(new Map());

    // Load root folders on mount
    useEffect(() => {
        loadFolderContents('');
    }, []);

    const loadFolderContents = async (folderPath) => {
        try {
            const response = await fetch(`/api/files?path=${encodeURIComponent(folderPath)}`);
            const data = await response.json();

            if (folderPath === '') {
                setRootFolders(data.folders || []);
            } else {
                setFolderContents(prev => new Map(prev).set(folderPath, data.folders || []));
            }
        } catch (error) {
            console.error('Error loading folder contents:', error);
        }
    };

    const toggleFolder = async (folderPath) => {
        const isExpanded = expandedFolders.has(folderPath);

        if (isExpanded) {
            // Collapse folder
            const newExpanded = new Set(expandedFolders);
            newExpanded.delete(folderPath);
            setExpandedFolders(newExpanded);
        } else {
            // Expand folder
            const newExpanded = new Set(expandedFolders);
            newExpanded.add(folderPath);
            setExpandedFolders(newExpanded);

            // Load contents if not already loaded
            if (!folderContents.has(folderPath)) {
                await loadFolderContents(folderPath);
            }
        }
    };

    const handleFolderClick = (folder) => {
        onFolderSelect(folder.path);
    };

    const renderFolder = (folder, level = 0) => {
        const isExpanded = expandedFolders.has(folder.path);
        const isSelected = selectedPath === folder.path;
        const subfolders = folderContents.get(folder.path) || [];

        return (
            <div key={folder.path}>
                <div
                    className={`${styles.folderItem} ${isSelected ? styles.selected : ''}`}
                    style={{ paddingLeft: `${level * 20}px` }}
                >
                    <div className={styles.folderContent}>
                        {folder.hasSubfolders ? (
                            <button
                                className={styles.expandButton}
                                onClick={() => toggleFolder(folder.path)}
                                aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
                            >
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    className={`${styles.arrow} ${isExpanded ? styles.expanded : ''}`}
                                >
                                    <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                </svg>
                            </button>
                        ) : (
                            <div className={styles.expandButton}></div>
                        )}

                        <div
                            className={styles.folderIcon}
                            onClick={() => handleFolderClick(folder)}
                        >
                            📁
                        </div>

                        <span
                            className={styles.folderName}
                            onClick={() => handleFolderClick(folder)}
                            title={folder.name}
                        >
                            {folder.name}
                        </span>
                    </div>
                </div>

                {isExpanded && subfolders.length > 0 && (
                    <div className={styles.subfolders}>
                        {subfolders.map(subfolder => renderFolder(subfolder, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.folderTree}>
            <div className={styles.header}>
                <div
                    className={`${styles.rootFolder} ${selectedPath === '' ? styles.selected : ''}`}
                    onClick={() => onFolderSelect('')}
                >
                    <div className={styles.folderIcon}>💾</div>
                    <span>This Disk</span>
                </div>
            </div>
            <div className={styles.folders}>
                {rootFolders.map(folder => renderFolder(folder))}
            </div>
        </div>
    );
}