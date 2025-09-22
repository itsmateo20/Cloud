// components/app/FolderTree.js
"use client";

import { useEffect, useState } from "react";
import styles from "./FolderTree.module.css";
import { api } from "@/utils/api";
import SoftLoading from "../SoftLoading";
import { HardDrive, Star, FolderClosed, FolderOpen, ChevronRight, ChevronDown, Save } from 'lucide-react';

export default function FolderTree({
    socket,
    onFolderSelect,
    selectedPath,
    mobile = false,
}) {
    const [rootFolders, setRootFolders] = useState([]);
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [folderContents, setFolderContents] = useState(new Map());
    const [loading, setLoading] = useState(true);

    const [tabVisibility, setTabVisibility] = useState({
        favorites: false,
    });

    useEffect(() => {
        if (!socket) return;

        const handleContentChange = () => {
            checkTabVisibility();
        };

        socket.on("folder-structure-updated", (payload) => {
            handleFolderStructureUpdate(payload);
        });

        socket.on("file-updated", (payload) => {
            if (payload.action === 'delete') {
                const deletedFolders = payload.deletedItems.filter(item => item.type === 'folder');
                if (deletedFolders.length > 0) handleFolderDeletion(payload.path, deletedFolders);
            }
        });

        socket?.on('file-favorited', handleContentChange);
        socket?.on('folder-structure-updated', handleContentChange);

        return () => {
            socket?.off('file-favorited', handleContentChange);
            socket?.off('folder-structure-updated');
        };
    }, [socket]);

    useEffect(() => {
        const autoExpandToPath = async () => {
            if (selectedPath === 'favorites') return;

            const pathParts = selectedPath.split('/').filter(part => part.length > 0);
            const foldersToExpand = [];
            for (let i = 0; i < pathParts.length; i++) {
                const folderPath = pathParts.slice(0, i + 1).join('/');
                foldersToExpand.push(folderPath);
            }

            const newExpanded = new Set(expandedFolders);
            let hasChanges = false;

            for (const folderPath of foldersToExpand) {
                if (!newExpanded.has(folderPath)) {
                    newExpanded.add(folderPath);
                    hasChanges = true;
                    if (!folderContents.has(folderPath)) {
                        try {
                            await loadFolderContents(folderPath);
                        } catch (error) { }
                    }
                }
            }
            if (hasChanges) setExpandedFolders(newExpanded);
        };

        autoExpandToPath();
    }, [selectedPath]);

    useEffect(() => {
        loadFolderContents("");
        checkTabVisibility();
    }, []);

    const handleFolderStructureUpdate = (payload) => {
        switch (payload.action) {
            case 'rename':
                handleFolderRename(payload.oldPath, payload.newPath, payload.oldName, payload.newName);
                break;
            case 'create':
                const parentPath = payload.newPath ? payload.newPath.split('/').slice(0, -1).join('/') : '';
                loadFolderContents(parentPath);
                break;
            case 'delete':
                const deletedFolders = payload.deletedItems.filter(item => item.type === 'folder');
                if (deletedFolders.length > 0) handleFolderDeletion(payload.path, deletedFolders);
                break;
            default:
                loadFolderContents("");
                break;
        }
    };

    const handleFolderRename = (oldPath, newPath, oldName, newName) => {
        setRootFolders(prev => prev.map(folder => {
            if (folder.path === oldPath) return { ...folder, name: newName, path: newPath };
            return folder;
        }));

        setFolderContents(prev => {
            const newContents = new Map();
            prev.forEach((folders, path) => {
                const updatedFolders = folders.map(folder => {
                    if (folder.path === oldPath) return { ...folder, name: newName, path: newPath };
                    return folder;
                });
                newContents.set(path, updatedFolders);
            });
            return newContents;
        });

        setExpandedFolders(prev => {
            const newExpanded = new Set();
            prev.forEach(path => {
                if (path === oldPath) newExpanded.add(newPath);
                else newExpanded.add(path);
            });
            return newExpanded;
        });
    };

    const handleFolderDeletion = (parentPath, deletedFolders) => {
        const deletedNames = deletedFolders.map(folder => folder.name);

        if (parentPath === '') setRootFolders(prev => prev.filter(folder => !deletedNames.includes(folder.name)));

        setFolderContents(prev => {
            const newContents = new Map(prev);
            if (newContents.has(parentPath)) {
                const updatedFolders = newContents.get(parentPath).filter(
                    folder => !deletedNames.includes(folder.name)
                );
                newContents.set(parentPath, updatedFolders);
            }
            return newContents;
        });

        setExpandedFolders(prev => {
            const newExpanded = new Set();
            prev.forEach(path => {
                const folderName = path.split('/').pop();
                if (!deletedNames.includes(folderName)) newExpanded.add(path);
            });
            return newExpanded;
        });
    };

    const loadFolderContents = async (folderPath) => {
        try {
            const data = await api.get(`/api/files?path=${encodeURIComponent(folderPath)}`);

            if (folderPath === "") {
                setRootFolders(data.folders || []);
                setLoading(false);
            } else setFolderContents(prev => new Map(prev).set(folderPath, data.folders || []));
        } catch (error) {
            if (folderPath === "") setLoading(false);
        }
    };

    const toggleFolder = async (folderPath) => {
        const isExpanded = expandedFolders.has(folderPath);

        if (isExpanded) {
            const newExpanded = new Set(expandedFolders);
            newExpanded.delete(folderPath);
            setExpandedFolders(newExpanded);
        } else {
            const newExpanded = new Set(expandedFolders);
            newExpanded.add(folderPath);
            setExpandedFolders(newExpanded);

            if (!folderContents.has(folderPath)) await loadFolderContents(folderPath);
        }
    };

    const handleFolderClick = (folder) => {
        onFolderSelect(folder.path);
    };

    const checkTabVisibility = async () => {
        try {
            const favoritesData = await api.get("/api/user/favorites");
            const hasFavorites = favoritesData.success && (
                (favoritesData.files && favoritesData.files.length > 0) ||
                (favoritesData.folders && favoritesData.folders.length > 0)
            );

            setTabVisibility({
                favorites: hasFavorites,
            });
        } catch (error) {
            setTabVisibility({
                favorites: false,
            });
        }
    };

    const renderFolder = (folder, level = 0) => {
        const isExpanded = expandedFolders.has(folder.path);
        const isSelected = selectedPath === folder.path;
        const subfolders = folderContents.get(folder.path) || [];

        return (
            <div key={folder.path}>
                <div
                    className={`${styles.folderItem} ${isSelected ? styles.selected : ""}`}
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
                                    className={`${styles.arrow} ${isExpanded ? styles.expanded : ""}`}
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
                            {isExpanded ? <FolderOpen size={16} /> : <FolderClosed size={16} />}
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

    if (loading) return (
        <div className={styles.folderTree}>
            <SoftLoading />
        </div>
    );

    return (
        <div className={styles.folderTree}>
            <div className={styles.header}>
                <div
                    className={`${styles.rootFolder} ${selectedPath === "" ? styles.selected : ""}`}
                    onClick={() => onFolderSelect("")}
                >
                    <div className={styles.folderIcon}>
                        <Save size={20} />
                    </div>
                    <span>This Disk</span>
                </div>

                {tabVisibility.favorites && (
                    <div
                        className={`${styles.specialItem} ${selectedPath === 'favorites' ? styles.selected : ''}`}
                        onClick={() => onFolderSelect('favorites')}
                    >
                        <span className={styles.folderIcon}><Star size={20} fill="currentColor" /></span>
                        <span>Favorites</span>
                    </div>
                )}
            </div>

            <div className={styles.folders}>
                {rootFolders.map(folder => renderFolder(folder))}
            </div>
        </div>
    );
}
