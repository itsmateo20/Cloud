// components/app/FileList.js

import { useState, useEffect } from "react";
import styles from "./FileList.module.css";
import SoftLoading from "../SoftLoading";
import { ContextMenu } from "./ContextMenu";
import { ImageViewer } from "./ImageViewer";

export function FileList({ socket, currentPath, onFolderDoubleClick }) {
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState(new Set());

    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        items: []
    });

    const [imageViewer, setImageViewer] = useState({
        isOpen: false,
        currentIndex: 0,
        images: []
    });

    useEffect(() => {
        loadContents();

        socket.on("file-updated", (payload) => {
            if (payload.path === currentPath) {
                handleFileUpdate(payload);
            }
        });
    }, [currentPath]);

    const handleFileUpdate = (payload) => {
        switch (payload.action) {
            case 'rename':
                handleItemRename(payload.oldName, payload.newName);
                break;
            case 'delete':
                handleItemsDelete(payload.deletedItems);
                break;
            case 'upload':
            case 'create':
                handleItemsAdd(payload.newItems);
                break;
            case 'refresh':
            default:
                loadContents();
                break;
        }
    };

    const handleItemRename = (oldName, newName) => {
        setFolders(prev => prev.map(folder =>
            folder.name === oldName
                ? { ...folder, name: newName, path: folder.path.replace(oldName, newName) }
                : folder
        ));

        setFiles(prev => prev.map(file =>
            file.name === oldName
                ? { ...file, name: newName, path: file.path.replace(oldName, newName) }
                : file
        ));

        setSelectedItems(prev => {
            const newSelected = new Set();
            prev.forEach(path => {
                if (path.endsWith(oldName)) {
                    newSelected.add(path.replace(oldName, newName));
                } else {
                    newSelected.add(path);
                }
            });
            return newSelected;
        });
    };

    const handleItemsDelete = (deletedItems) => {
        const deletedNames = deletedItems.map(item => item.name);

        setFolders(prev => prev.filter(folder => !deletedNames.includes(folder.name)));
        setFiles(prev => prev.filter(file => !deletedNames.includes(file.name)));

        setSelectedItems(prev => {
            const newSelected = new Set();
            prev.forEach(path => {
                const itemName = path.split('/').pop();
                if (!deletedNames.includes(itemName)) {
                    newSelected.add(path);
                }
            });
            return newSelected;
        });
    };

    const handleItemsAdd = (newItems) => {
        newItems.forEach(item => {
            if (item.type === 'folder') {
                setFolders(prev => {
                    if (prev.some(f => f.name === item.name)) return prev;
                    return [...prev, item].sort((a, b) => a.name.localeCompare(b.name));
                });
            } else {
                setFiles(prev => {
                    if (prev.some(f => f.name === item.name)) return prev;
                    return [...prev, item].sort((a, b) => a.name.localeCompare(b.name));
                });
            }
        });
    };

    const getImageFiles = () => {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
        return files.filter(file => {
            const ext = file.name.split('.').pop()?.toLowerCase();
            return imageExtensions.includes(ext);
        });
    };

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

        if (!selectedItems.has(item.path)) {
            setSelectedItems(new Set([item.path]));
        }

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

    const isImageFile = (filename) => {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
        const ext = filename.split('.').pop()?.toLowerCase();
        return imageExtensions.includes(ext);
    };

    const openImageViewer = (file) => {
        const images = getImageFiles();
        const currentIndex = images.findIndex(img => img.path === file.path);

        if (currentIndex !== -1) {
            setImageViewer({
                isOpen: true,
                currentIndex,
                images
            });
        }
    };

    const handleImageViewerAction = async (action, image) => {
        switch (action) {
            case 'rename':
                const newName = prompt('Enter new name:', image.name);
                if (newName && newName !== image.name) {
                    try {
                        const response = await fetch('/api/files/rename', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                oldPath: image.path,
                                newName: newName
                            })
                        });

                        if (response.ok) setImageViewer(prev => ({ ...prev, isOpen: false }));
                        else alert('Failed to rename file');
                    } catch (error) {
                        console.error('Error renaming:', error);
                        alert('Error renaming file');
                    }
                }
                break;

            case 'delete':
                const confirmed = confirm(`Are you sure you want to delete "${image.name}"?`);
                if (confirmed) {
                    try {
                        const response = await fetch('/api/files/delete', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                paths: [image.path]
                            })
                        });

                        if (response.ok) setImageViewer(prev => ({ ...prev, isOpen: false }));
                        else alert('Failed to delete file');
                    } catch (error) {
                        console.error('Error deleting:', error);
                        alert('Error deleting file');
                    }
                }
                break;

            case 'share':
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: image.name,
                            url: `/api/files/download?path=${encodeURIComponent(image.path)}`
                        });
                    } catch (error) {
                        console.log('Share cancelled or failed');
                    }
                } else {
                    const shareUrl = `${window.location.origin}/api/files/download?path=${encodeURIComponent(image.path)}`;
                    navigator.clipboard.writeText(shareUrl);
                    alert('Share link copied to clipboard');
                }
                break;

            case 'favorite':
                console.log('Add to favorites:', image);
                break;

            case 'properties':
                alert(`Properties for: ${image.name}\nPath: ${image.path}\nSize: ${formatFileSize(image.size)}\nModified: ${formatDate(image.modified)}`);
                break;
        }
    };

    const handleFolderDoubleClick = (folder) => {
        onFolderDoubleClick(folder.path);
    };

    const handleContextMenuAction = async (action, items) => {
        console.log(`Action: ${action}`, items);

        switch (action) {
            case 'open':
                if (items[0].type === 'folder') handleFolderDoubleClick(items[0]);
                else if (isImageFile(items[0].name)) openImageViewer(items[0]);
                else window.open(`/api/files/download?path=${encodeURIComponent(items[0].path)}`, '_blank');
                break;

            case 'download':
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

                            if (!response.ok) alert('Failed to rename file/folder');
                        } catch (error) {
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

                        if (response.ok) setSelectedItems(new Set());
                        else alert('Failed to delete items');
                    } catch (error) {
                        alert('Error deleting items');
                    }
                }
                break;

            case 'copy':
                const paths = items.map(item => item.path).join('\n');
                navigator.clipboard.writeText(paths).then(() => {
                    console.log('Paths copied to clipboard');
                }).catch(err => {
                    console.error('Failed to copy paths:', err);
                });
                break;

            case 'share':
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
                    const shareUrl = `${window.location.origin}/api/files/download?path=${encodeURIComponent(items[0].path)}`;
                    navigator.clipboard.writeText(shareUrl);
                    alert('Share link copied to clipboard');
                }
                break;

            case 'favorite':
                console.log('Add to favorites:', items);
                break;

            case 'properties':
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
                        onDoubleClick={() => {
                            if (isImageFile(file.name)) {
                                openImageViewer(file);
                            }
                        }}
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

            <ImageViewer
                isOpen={imageViewer.isOpen}
                currentImageIndex={imageViewer.currentIndex}
                images={imageViewer.images}
                onClose={() => setImageViewer(prev => ({ ...prev, isOpen: false }))}
                onNavigate={(newIndex) => setImageViewer(prev => ({ ...prev, currentIndex: newIndex }))}
                onAction={handleImageViewerAction}
            />
        </div>
    );
}