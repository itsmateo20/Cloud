// components/app/FileList.js

import { useState, useEffect } from "react";
import styles from "./FileList.module.css";
import Loading from "../Loading";
import SoftLoading from "../SoftLoading";
import { ContextMenu } from "./ContextMenu";

export function FileList({ currentPath, onFolderDoubleClick }) {
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState(new Set());

    // Context menu state
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        items: []
    });

    useEffect(() => {
        loadContents();
    }, [currentPath]);

    // Close context menu when clicking elsewhere
    useEffect(() => {
        const handleClick = () => {
            if (contextMenu.visible) {
                setContextMenu(prev => ({ ...prev, visible: false }));
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [contextMenu.visible]);

    const loadContents = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/files?path=${encodeURIComponent(currentPath)}`);
            const data = await response.json();
            setFolders(data.folders || []);
            setFiles(data.files || []);
            setSelectedItems(new Set());
        } catch (error) {
            console.error('Error loading contents:', error);
            setFolders([]);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = (item, event) => {
        if (event.ctrlKey || event.metaKey) {
            const newSelected = new Set(selectedItems);
            if (newSelected.has(item.path)) {
                newSelected.delete(item.path);
            } else {
                newSelected.add(item.path);
            }
            setSelectedItems(newSelected);
        } else {
            setSelectedItems(new Set([item.path]));
        }
    };

    const handleItemRightClick = (item, event) => {
        event.preventDefault();

        // If right-clicking on unselected item, select only that item
        if (!selectedItems.has(item.path)) {
            setSelectedItems(new Set([item.path]));
        }

        // Get selected items data
        const allItems = [...folders, ...files];
        const selectedItemsData = allItems.filter(i =>
            selectedItems.has(i.path) || i.path === item.path
        ).map(i => ({
            ...i,
            type: folders.includes(i) ? 'folder' : 'file'
        }));

        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            items: selectedItemsData
        });
    };

    const handleFolderDoubleClick = (folder) => {
        onFolderDoubleClick(folder.path);
    };

    const handleContextMenuAction = async (action, items) => {
        console.log(`Action: ${action}`, items);

        switch (action) {
            case 'open':
                if (items[0].type === 'folder') {
                    handleFolderDoubleClick(items[0]);
                } else {
                    // Handle file opening
                    window.open(`/api/files/download?path=${encodeURIComponent(items[0].path)}`, '_blank');
                }
                break;

            case 'download':
                // Handle download
                items.forEach(item => {
                    if (item.type === 'file') {
                        const link = document.createElement('a');
                        link.href = `/api/files/download?path=${encodeURIComponent(item.path)}`;
                        link.download = item.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                });
                break;

            case 'rename':
                if (items.length === 1) {
                    const newName = prompt('Enter new name:', items[0].name);
                    if (newName && newName !== items[0].name) {
                        try {
                            const response = await fetch('/api/files/rename', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    oldPath: items[0].path,
                                    newName: newName
                                })
                            });

                            if (response.ok) {
                                loadContents(); // Refresh the list
                            } else {
                                alert('Failed to rename file/folder');
                            }
                        } catch (error) {
                            console.error('Error renaming:', error);
                            alert('Error renaming file/folder');
                        }
                    }
                }
                break;

            case 'delete':
                const confirmed = confirm(`Are you sure you want to delete ${items.length} item(s)?`);
                if (confirmed) {
                    try {
                        const response = await fetch('/api/files/delete', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                paths: items.map(item => item.path)
                            })
                        });

                        if (response.ok) {
                            loadContents(); // Refresh the list
                            setSelectedItems(new Set()); // Clear selection
                        } else {
                            alert('Failed to delete items');
                        }
                    } catch (error) {
                        console.error('Error deleting:', error);
                        alert('Error deleting items');
                    }
                }
                break;

            case 'copy':
                // Copy paths to clipboard or implement copy functionality
                const paths = items.map(item => item.path).join('\n');
                navigator.clipboard.writeText(paths).then(() => {
                    console.log('Paths copied to clipboard');
                }).catch(err => {
                    console.error('Failed to copy paths:', err);
                });
                break;

            case 'share':
                // Implement share functionality
                if (navigator.share && items.length === 1) {
                    try {
                        await navigator.share({
                            title: items[0].name,
                            url: `/api/files/download?path=${encodeURIComponent(items[0].path)}`
                        });
                    } catch (error) {
                        console.log('Share cancelled or failed');
                    }
                } else {
                    // Fallback: copy share link
                    const shareUrl = `${window.location.origin}/api/files/download?path=${encodeURIComponent(items[0].path)}`;
                    navigator.clipboard.writeText(shareUrl);
                    alert('Share link copied to clipboard');
                }
                break;

            case 'favorite':
                // Implement favorite functionality
                console.log('Add to favorites:', items);
                // You could store favorites in localStorage or send to API
                break;

            case 'properties':
                // Show properties dialog
                alert(`Properties for: ${items[0].name}\nPath: ${items[0].path}\nSize: ${items[0].size ? formatFileSize(items[0].size) : 'N/A'}\nModified: ${formatDate(items[0].modified)}`);
                break;

            default:
                console.log('Unhandled action:', action);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getFileIcon = (filename) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'bmp':
            case 'svg':
                return '🖼️';
            case 'pdf':
                return '📄';
            case 'doc':
            case 'docx':
                return '📝';
            case 'xls':
            case 'xlsx':
                return '📊';
            case 'txt':
                return '📃';
            case 'zip':
            case 'rar':
            case '7z':
                return '🗜️';
            case 'mp3':
            case 'wav':
            case 'flac':
                return '🎵';
            case 'mp4':
            case 'avi':
            case 'mkv':
                return '🎬';
            default:
                return '📄';
        }
    };

    if (loading) {
        return <SoftLoading />;
    }

    return (
        <div className={styles.fileList}>
            <div className={styles.header}>
                <div className={styles.headerCell} style={{ width: '40%' }}>Name</div>
                <div className={styles.headerCell} style={{ width: '20%' }}>Date modified</div>
                <div className={styles.headerCell} style={{ width: '15%' }}>Type</div>
                <div className={styles.headerCell} style={{ width: '15%' }}>Size</div>
            </div>

            <div className={styles.content}>
                {folders.map(folder => (
                    <div
                        key={folder.path}
                        className={`${styles.item} ${selectedItems.has(folder.path) ? styles.selected : ''}`}
                        onClick={(e) => handleItemClick(folder, e)}
                        onDoubleClick={() => handleFolderDoubleClick(folder)}
                        onContextMenu={(e) => handleItemRightClick(folder, e)}
                    >
                        <div className={styles.cell} style={{ width: '40%' }}>
                            <span className={styles.icon}>📁</span>
                            <span className={styles.name}>{folder.name}</span>
                        </div>
                        <div className={styles.cell} style={{ width: '20%' }}>
                            {formatDate(folder.modified)}
                        </div>
                        <div className={styles.cell} style={{ width: '15%' }}>
                            File folder
                        </div>
                        <div className={styles.cell} style={{ width: '15%' }}>
                            —
                        </div>
                    </div>
                ))}

                {files.map(file => (
                    <div
                        key={file.path}
                        className={`${styles.item} ${selectedItems.has(file.path) ? styles.selected : ''}`}
                        onClick={(e) => handleItemClick(file, e)}
                        onContextMenu={(e) => handleItemRightClick(file, e)}
                    >
                        <div className={styles.cell} style={{ width: '40%' }}>
                            <span className={styles.icon}>{getFileIcon(file.name)}</span>
                            <span className={styles.name}>{file.name}</span>
                        </div>
                        <div className={styles.cell} style={{ width: '20%' }}>
                            {formatDate(file.modified)}
                        </div>
                        <div className={styles.cell} style={{ width: '15%' }}>
                            {file.name.split('.').pop()?.toUpperCase() || 'File'}
                        </div>
                        <div className={styles.cell} style={{ width: '15%' }}>
                            {formatFileSize(file.size)}
                        </div>
                    </div>
                ))}

                {folders.length === 0 && files.length === 0 && (
                    <div className={styles.empty}>
                        This folder is empty
                    </div>
                )}
            </div>

            <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                isVisible={contextMenu.visible}
                onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
                selectedItems={contextMenu.items}
                onAction={handleContextMenuAction}
            />
        </div>
    );
}