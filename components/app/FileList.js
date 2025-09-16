// components/app/FileList.js

import { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { api } from "@/utils/api";
import { downloadFile, downloadFolder } from "@/utils/downloadUtils";

import styles from "./FileList.module.css";
import SoftLoading from "@/components/SoftLoading";
import React from 'react';

// Lightweight in-memory cache so previously loaded thumbnails don't show loader again
const ThumbnailWithLoader = ({ src, alt, cacheRef }) => {
    const [loaded, setLoaded] = useState(() => cacheRef?.current?.has(src));

    useEffect(() => {
        if (cacheRef?.current?.has(src)) {
            setLoaded(true);
        }
    }, [src, cacheRef]);

    const handleLoad = () => {
        if (cacheRef?.current && !cacheRef.current.has(src)) {
            cacheRef.current.add(src);
        }
        setLoaded(true);
    };

    return (
        <>
            {!loaded && <div className={styles.thumbLoader}><SoftLoading /></div>}
            <img
                src={src}
                alt={alt}
                className={styles.thumbnailImage}
                loading="lazy"
                decoding="async"
                style={!loaded ? { visibility: 'hidden', position: 'absolute' } : {}}
                onLoad={handleLoad}
                onError={(e) => { e.currentTarget.style.display = 'none'; setLoaded(true); }}
            />
        </>
    );
};

import { ContextMenu } from "./ContextMenu";
import { useToast } from './ToastProvider';
import ConfirmModal from "./ConfirmModal";
import { FileViewer } from "./FileViewer";

import {
    Image,
    FileText,
    FileSpreadsheet,
    FolderClosed,
    Music,
    Video,
    Archive,
    File,
    Code,
    FileJson,
    FileX,
    Star
} from 'lucide-react';

const formatDate = (date) => {
    if (!date) return '—';

    try {
        const dateObj = new Date(date);

        if (isNaN(dateObj.getTime())) {
            return '—';
        }

        return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        return '—';
    }
};

const getFileIcon = (filename, size = 16) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'svg':
        case 'webp':
            return <Image size={size} />;
        case 'pdf':
            return <FileText size={size} />;
        case 'doc':
        case 'docx':
            return <FileText size={size} />;
        case 'xls':
        case 'xlsx':
            return <FileSpreadsheet size={size} />;
        case 'txt':
        case 'md':
            return <FileText size={size} />;
        case 'zip':
        case 'rar':
        case '7z':
        case 'tar':
        case 'gz':
            return <Archive size={size} />;
        case 'mp3':
        case 'wav':
        case 'flac':
        case 'm4a':
        case 'aac':
            return <Music size={size} />;
        case 'mp4':
        case 'avi':
        case 'mkv':
        case 'webm':
        case 'ogg':
        case 'mov':
        case 'wmv':
        case 'flv':
            return <Video size={size} />;
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
        case 'html':
        case 'htm':
        case 'css':
        case 'scss':
        case 'sass':
        case 'py':
        case 'java':
        case 'c':
        case 'cpp':
        case 'h':
        case 'cs':
        case 'php':
        case 'rb':
        case 'go':
        case 'rs':
        case 'swift':
        case 'sql':
        case 'sh':
        case 'bash':
        case 'ps1':
            return <Code size={size} />;
        case 'json':
        case 'xml':
        case 'yml':
        case 'yaml':
        case 'toml':
        case 'ini':
        case 'cfg':
        case 'conf':
            return <FileJson size={size} />;
        default:
            return <File size={size} />;
    }
};

const getFileType = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const types = {
        'jpg': 'Image', 'jpeg': 'Image', 'png': 'Image', 'gif': 'Image', 'bmp': 'Image', 'svg': 'Image', 'webp': 'Image',
        'mp4': 'Video', 'webm': 'Video', 'ogg': 'Video', 'avi': 'Video', 'mov': 'Video', 'wmv': 'Video', 'flv': 'Video', 'mkv': 'Video',
        'mp3': 'Audio', 'wav': 'Audio', 'flac': 'Audio', 'm4a': 'Audio', 'aac': 'Audio',
        'pdf': 'PDF Document', 'doc': 'Word Document', 'docx': 'Word Document', 'xls': 'Excel Spreadsheet', 'xlsx': 'Excel Spreadsheet',
        'ppt': 'PowerPoint', 'pptx': 'PowerPoint', 'txt': 'Text Document', 'rtf': 'Rich Text Document',
        'js': 'JavaScript', 'jsx': 'React JSX', 'ts': 'TypeScript', 'tsx': 'TypeScript JSX', 'html': 'HTML Document',
        'css': 'CSS Stylesheet', 'scss': 'SCSS Stylesheet', 'sass': 'Sass Stylesheet', 'py': 'Python', 'java': 'Java',
        'c': 'C Source', 'cpp': 'C++ Source', 'h': 'Header File', 'cs': 'C# Source', 'php': 'PHP', 'rb': 'Ruby',
        'go': 'Go Source', 'rs': 'Rust Source', 'swift': 'Swift Source', 'sql': 'SQL Script',
        'zip': 'ZIP Archive', 'rar': 'RAR Archive', '7z': '7-Zip Archive', 'tar': 'TAR Archive', 'gz': 'Gzip Archive',
        'json': 'JSON File', 'xml': 'XML File', 'yml': 'YAML File', 'yaml': 'YAML File', 'toml': 'TOML File',
        'ini': 'Configuration File', 'cfg': 'Configuration File', 'conf': 'Configuration File'
    };
    return types[ext] || 'File';
};

const isImage = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext);
};

const isVideo = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext);
};

const getPreviewUrl = (file, currentPath) => {
    if (isImage(file.name)) {
        const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
        // Attempt to use modified timestamp for cache busting
        const mod = file.modified || file.modifiedAt || file.updatedAt || file.createdAt || '';
        const v = mod ? new Date(mod).getTime() : '';
        return `/api/files/thumbnail?path=${encodeURIComponent(fullPath)}${v ? `&v=${v}` : ''}`;
    }
    return null;
};

const getVideoThumbnailUrl = (file, currentPath) => {
    if (isVideo(file.name)) {
        const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
        const mod = file.modified || file.modifiedAt || file.updatedAt || file.createdAt || '';
        const v = mod ? new Date(mod).getTime() : '';
        return `/api/files/video-thumbnail?path=${encodeURIComponent(fullPath)}${v ? `&v=${v}` : ''}`;
    }
    return null;
};

const FileList = forwardRef(({
    socket,
    currentPath,
    onFolderDoubleClick,
    onContentChange,
    onSelectionChange,
    onFilesUpload,
    sortBy = 'name',
    viewMode = 'list',
    user,
    mobile = false,
}, ref) => {
    const toast = (() => { try { return useToast(); } catch { return null; } })();
    // Holds successfully loaded thumbnail URLs for session-level memory cache
    const thumbnailCacheRef = useRef(new Set());
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [lastSelectedItem, setLastSelectedItem] = useState(null);

    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        items: []
    });

    const [fileViewer, setFileViewer] = useState({
        isOpen: false,
        currentIndex: 0,
        files: []
    });

    // Column width state for details view
    const [columnWidths, setColumnWidths] = useState({
        name: 40,
        dateModified: 25,
        type: 20,
        size: 15
    });

    const [resizing, setResizing] = useState({
        isResizing: false,
        startX: 0,
        startWidth: 0,
        column: null
    });

    const [isDragOver, setIsDragOver] = useState(false);
    const [renaming, setRenaming] = useState({ active: false, items: [], value: "" });
    const [qrModal, setQrModal] = useState({ visible: false, type: '', qrCode: '', items: [] });
    const renameInputRef = useRef(null);

    // Column resize functions
    const handleResizeStart = (e, column) => {
        e.preventDefault();
        setResizing({
            isResizing: true,
            startX: e.clientX,
            startWidth: columnWidths[column],
            column
        });
    };

    const handleResizeMove = useCallback((e) => {
        if (!resizing.isResizing) return;

        const deltaX = e.clientX - resizing.startX;
        const newWidth = Math.max(10, Math.min(80, resizing.startWidth + (deltaX / window.innerWidth * 100)));

        setColumnWidths(prev => ({
            ...prev,
            [resizing.column]: newWidth
        }));
    }, [resizing]);

    const handleResizeEnd = useCallback(() => {
        setResizing({
            isResizing: false,
            startX: 0,
            startWidth: 0,
            column: null
        });
    }, []);

    // Add event listeners for column resizing
    useEffect(() => {
        if (resizing.isResizing) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
            return () => {
                document.removeEventListener('mousemove', handleResizeMove);
                document.removeEventListener('mouseup', handleResizeEnd);
            };
        }
    }, [resizing.isResizing, handleResizeMove, handleResizeEnd]);

    // Rename functions
    const handleRenameInput = (e) => {
        setRenaming(prev => ({ ...prev, value: e.target.value }));
    };

    const submitRename = async () => {
        if (!renaming.active || renaming.items.length === 0 || !renaming.value.trim()) {
            return cancelRename();
        }

        const items = renaming.items;
        const newName = renaming.value.trim();

        try {
            if (items.length === 1) {
                const item = items[0];
                if (newName === item.name) {
                    return cancelRename();
                }

                const requestData = {
                    oldPath: item.path,
                    newName: newName
                };

                const response = await api.post('/api/files/rename', requestData);

                if (response.success) {
                    if (item.isFavorited) {
                        const newPath = item.path.replace(item.name, newName);
                        await api.post('/api/user/favorites', {
                            action: 'update-path',
                            items: [{
                                oldPath: item.path,
                                newPath: newPath,
                                newName: newName,
                                isFolder: item.type === 'folder'
                            }]
                        });
                    }
                    refreshContent();
                    toast?.addSuccess('Renamed successfully');
                } else {
                    toast?.addError('Failed to rename');
                }
            } else {
                // Multi-rename logic
                const baseName = newName;
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const originalExt = item.name.includes('.') ? '.' + item.name.split('.').pop() : '';
                    const finalName = i === 0 ? baseName + originalExt : `${baseName} (${i})${originalExt}`;

                    const requestData = {
                        oldPath: item.path,
                        newName: finalName
                    };

                    const response = await api.post('/api/files/rename', requestData);
                    if (response.success && item.isFavorited) {
                        const newPath = item.path.replace(item.name, finalName);
                        await api.post('/api/user/favorites', {
                            action: 'update-path',
                            items: [{
                                oldPath: item.path,
                                newPath: newPath,
                                newName: finalName,
                                isFolder: item.type === 'folder'
                            }]
                        });
                    }
                }
                refreshContent();
                toast?.addSuccess('Items renamed');
            }
        } catch (error) {
            console.error('Error renaming:', error);
            toast?.addError('Error renaming');
        }

        cancelRename();
    };

    const cancelRename = () => {
        setRenaming({ active: false, items: [], value: "" });
    };

    // QR Code functions
    const generateQRCode = async (type, items) => {
        try {
            const response = await api.post('/api/qr/generate', {
                type,
                items: items.map(item => ({
                    path: item.path,
                    name: item.name,
                    type: item.type
                })),
                currentPath
            });

            if (response.success) {
                setQrModal({
                    visible: true,
                    type,
                    qrCode: response.qrCode,
                    items
                });
                toast?.addSuccess(type === 'download' ? 'QR code ready (download)' : 'QR code ready (upload)');
            } else {
                toast?.addError('Failed to generate QR code');
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
            toast?.addError('Error generating QR code');
        }
    };

    const loadContents = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get(`/api/files?path=${encodeURIComponent(currentPath)}`);
            setFolders(data.folders || []);
            setFiles(data.files || []);
            setSelectedItems(new Set());
            setLastSelectedItem(null);
        } catch (error) {
            console.error('Error loading contents:', error);
            setFolders([]);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    }, [currentPath]);
    const refreshContent = useCallback(() => {
        if (currentPath === "favorites") {

            api.get("/api/user/favorites")
                .then(data => {
                    if (data.success) {
                        setFiles(data.files || []);
                        setFolders(data.folders || []);
                    }
                });
        } else {
            loadContents();
        }
    }, [onContentChange, currentPath, loadContents]);
    useImperativeHandle(ref, () => ({
        triggerFavorite: (items) => {
            handleContextMenuAction('favorite', items);
        },
        refresh: refreshContent,
        updateItem: (path, patch) => {
            if (!path) return;
            setFiles(prev => prev.map(f => f.path === path ? { ...f, ...patch } : f));
            setFolders(prev => prev.map(f => f.path === path ? { ...f, ...patch } : f));
        },
        selectAll: () => {
            try {
                const allItems = [...folders, ...files];
                const allPaths = new Set(allItems.map(item => item.path));
                setSelectedItems(allPaths);
                onSelectionChange?.(allItems);
            } catch (error) {
                console.error('Error in selectAll:', error);
            }
        },
        startRename: (item) => {
            if (!item) return;
            setRenaming({ active: true, items: [item], value: item.name });
        }
    }));

    useEffect(() => {
        if (currentPath === "favorites") {
            api.get("/api/user/favorites")
                .then(async data => {
                    if (data.success) {
                        setFiles(data.files || []);
                        setFolders(data.folders || []);
                        try {
                            const cleanupResponse = await api.post('/api/user/favorites', {
                                action: 'cleanup-orphaned'
                            });

                            if (cleanupResponse.success && cleanupResponse.cleaned > 0) {
                                const refreshData = await api.get("/api/user/favorites");
                                if (refreshData.success) {
                                    setFiles(refreshData.files || []);
                                    setFolders(refreshData.folders || []);
                                }
                            }
                        } catch (error) {
                            console.error('Error cleaning up orphaned favorites:', error);
                        }
                    }
                });
        } else {
            loadContents();
        }
    }, [currentPath]);

    useEffect(() => {
        if (!socket) return;

        socket?.on("file-updated", (payload) => {
            if (payload.path === currentPath) {
                handleFileUpdate(payload);
            }
        });

        socket?.on("fileUploadedViaQR", (payload) => {
            if (payload.userId === user?.id && payload.path === currentPath) {
                loadContents();
            }
        });

        return () => {
            socket?.off("file-updated");
            socket?.off("fileUploadedViaQR");
        };
    }, [socket, currentPath, user?.id]);

    const handleFileUpdate = (payload) => {
        switch (payload.action) {
            case 'rename':
                handleItemRename(payload.oldName, payload.newName);
                break;
            case 'delete':
                handleItemsDelete(payload.deletedItems);
                break;
            case 'upload':
                handleItemsAdd(payload.files || payload.newItems);
                break;
            case 'create':
                handleItemsAdd(payload.newItems || payload.files);
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
        if (!newItems || !Array.isArray(newItems)) {
            console.warn('handleItemsAdd called with invalid newItems:', newItems);
            loadContents();
            return;
        }
        <ConfirmModal
            open={confirmState.open}
            title={confirmState.title}
            message={confirmState.message}
            onCancel={() => {
                // Special handling: if download choice modal canceled, treat as QR path
                if (confirmState.action === 'context-download-mode') {
                    generateQRCode('download', confirmState.context);
                }
                closeConfirm();
            }}
            onConfirm={executeConfirmedAction}
            destructive={confirmState.destructive}
            confirmLabel={confirmState.confirmLabel}
            cancelLabel={confirmState.cancelLabel}
        />

        newItems.forEach(item => {
            const itemType = item.type || (item.name && item.name.includes('.') ? 'file' : 'folder');
            const itemName = item.name;
            const itemPath = item.path;

            if (itemType === 'folder') {
                setFolders(prev => {
                    if (prev.some(f => f.name === itemName)) return prev;
                    return [...prev, {
                        ...item,
                        type: 'folder',
                        name: itemName,
                        path: itemPath
                    }].sort((a, b) => a.name.localeCompare(b.name));
                });
            } else {
                setFiles(prev => {
                    if (prev.some(f => f.name === itemName)) return prev;
                    return [...prev, {
                        ...item,
                        type: 'file',
                        name: itemName,
                        path: itemPath,
                        size: item.size || 0
                    }].sort((a, b) => a.name.localeCompare(b.name));
                });
            }
        });
    };

    const getViewableFiles = () => {
        return files.filter(item => item.type !== 'email-group' && item.type === 'file');
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

    const handleItemClick = (item, event) => {
        // On mobile, single click opens folders
        if (mobile && item.type === 'folder' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            onFolderDoubleClick(item.path);
            return;
        }

        // On mobile (both list and grid view), single click opens files in FileViewer
        if (mobile && item.type === 'file' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            if (isViewableFile(item.name)) {
                openFileViewer(item);
            } else {
                // For non-viewable files, download them
                downloadFile(item.path, item.name);
            }
            return;
        }

        if (event.ctrlKey || event.metaKey) {
            const newSelected = new Set(selectedItems);
            if (newSelected.has(item.path)) {
                newSelected.delete(item.path);
            } else {
                newSelected.add(item.path);
            }
            setSelectedItems(newSelected);
            setLastSelectedItem(item);
        } else if (event.shiftKey && lastSelectedItem) {
            const allItems = [...folders, ...files];
            const lastIndex = allItems.findIndex(i => i.path === lastSelectedItem.path);
            const currentIndex = allItems.findIndex(i => i.path === item.path);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const startIndex = Math.min(lastIndex, currentIndex);
                const endIndex = Math.max(lastIndex, currentIndex);

                const rangeItems = allItems.slice(startIndex, endIndex + 1);
                const newSelected = new Set(selectedItems);
                rangeItems.forEach(rangeItem => {
                    newSelected.add(rangeItem.path);
                });

                setSelectedItems(newSelected);
            }
        } else {
            setSelectedItems(new Set([item.path]));
            setLastSelectedItem(item);
        }
    };

    const handleItemRightClick = (item, event) => {
        event.preventDefault();
        let updatedSelection;
        if (!selectedItems.has(item.path)) {
            updatedSelection = new Set([item.path]);
            setSelectedItems(updatedSelection);
            setLastSelectedItem(item);
        } else {
            updatedSelection = selectedItems;
        }

        const allItems = [...folders, ...files];
        const selectedItemsData = allItems.filter(i =>
            updatedSelection.has(i.path) && i.type !== 'email-group'
        ).map(i => ({
            ...i,
            type: i.type === 'folder' ? 'folder' : 'file'
        }));

        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            items: selectedItemsData
        });
    };

    const isViewableFile = (filename) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        const viewableExtensions = [
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp',
            'mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv',
            'txt', 'md', 'json', 'xml', 'csv', 'log',
            'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'sass',
            'py', 'java', 'c', 'cpp', 'h', 'cs', 'php', 'rb', 'go', 'rs',
            'swift', 'sql', 'sh', 'bash', 'ps1', 'yml', 'yaml', 'toml', 'ini', 'cfg',
            'pdf'
        ];
        return viewableExtensions.includes(ext);
    };

    const openFileViewer = (file) => {
        const viewableFiles = getViewableFiles();
        const currentIndex = viewableFiles.findIndex(f => f.path === file.path);

        if (currentIndex !== -1) {
            setFileViewer({
                isOpen: true,
                currentIndex,
                files: viewableFiles
            });
        }
    };

    // Centralized confirmation modal state
    const [confirmState, setConfirmState] = useState({
        open: false,
        title: '',
        message: '',
        destructive: false,
        context: null,
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        action: ''
    });

    const openConfirm = (cfg) => setConfirmState(prev => ({ ...prev, open: true, ...cfg }));
    const closeConfirm = () => setConfirmState(prev => ({ ...prev, open: false, context: null, action: '' }));

    const executeConfirmedAction = async () => {
        const { action, context } = confirmState;
        if (!action) { closeConfirm(); return; }
        try {
            switch (action) {
                case 'fileViewer-delete': {
                    const file = context;
                    const requestData = { paths: [file.path] };
                    const response = await api.post('/api/files/delete', requestData);
                    if (response.success) {
                        setFileViewer(prev => ({ ...prev, isOpen: false }));
                        refreshContent();
                        toast?.addSuccess('File deleted');
                    } else {
                        toast?.addError('Failed to delete file');
                    }
                    break;
                }
                case 'context-delete': {
                    const items = context;
                    const requestData = { paths: items.map(i => i.path) };
                    const response = await api.post('/api/files/delete', requestData);
                    if (response.success) {
                        setSelectedItems(new Set());
                        setLastSelectedItem(null);
                        refreshContent();
                        toast?.addSuccess(items.length === 1 ? 'Item deleted' : `${items.length} items deleted`);
                    } else toast?.addError('Failed to delete items');
                    break;
                }
                case 'context-download-mode': {
                    // user chose direct download inside modal
                    const items = context;
                    items.forEach(item => {
                        if (item.type === 'file') downloadFile(item.path, item.name);
                        else if (item.type === 'folder') downloadFolder(item.path, item.name);
                    });
                    break;
                }
                case 'favorite-multi-add': {
                    const items = context;
                    for (const item of items) {
                        if (!item.isFavorited) {
                            try {
                                await api.post('/api/user/favorites', {
                                    fileId: item.type === 'file' ? item.id : undefined,
                                    folderId: item.type === 'folder' ? item.id : undefined,
                                    action: 'add'
                                });
                                if (item.type === 'file') {
                                    setFiles(prev => prev.map(f => f.path === item.path ? { ...f, isFavorited: true } : f));
                                } else {
                                    setFolders(prev => prev.map(f => f.path === item.path ? { ...f, isFavorited: true } : f));
                                }
                            } catch (e) { console.error('Error updating favorite status:', e); }
                        }
                    }
                    refreshContent();
                    toast?.addInfo('Added to favorites');
                    break;
                }
                case 'favorite-multi-remove': {
                    const { items, fromFavoritesPath } = context;
                    if (fromFavoritesPath) {
                        const response = await api.post('/api/user/favorites', {
                            action: 'remove',
                            items: items.map(item => ({ name: item.name, path: item.path, isFolder: item.isFolder || item.type === 'folder' }))
                        });
                        if (response.success) {
                            setFiles(prev => prev.filter(f => !items.some(it => it.name === f.name)));
                            setFolders(prev => prev.filter(f => !items.some(it => it.name === f.name)));
                            setSelectedItems(new Set());
                            setLastSelectedItem(null);
                            refreshContent();
                            toast?.addInfo('Removed from favorites');
                        } else toast?.addError(response.message || 'Failed to remove from favorites');
                    } else {
                        for (const item of items) {
                            if (item.isFavorited) {
                                try {
                                    await api.post('/api/user/favorites', {
                                        fileId: item.type === 'file' ? item.id : undefined,
                                        folderId: item.type === 'folder' ? item.id : undefined,
                                        action: 'remove'
                                    });
                                    if (item.type === 'file') setFiles(prev => prev.map(f => f.path === item.path ? { ...f, isFavorited: false } : f));
                                    else setFolders(prev => prev.map(f => f.path === item.path ? { ...f, isFavorited: false } : f));
                                } catch (e) { console.error('Error removing from favorites:', e); }
                            }
                        }
                        refreshContent();
                        toast?.addInfo('Removed from favorites');
                    }
                    break;
                }
                default:
                    break;
            }
        } finally {
            closeConfirm();
        }
    };

    const handleFileViewerAction = async (action, file) => {
        switch (action) {
            case 'rename':
                // Trigger inline rename for the file in the viewer
                setRenaming({ active: true, items: [file], value: file.name });
                setFileViewer(prev => ({ ...prev, isOpen: false }));
                break;

            case 'delete':
                openConfirm({
                    title: 'Delete File',
                    message: `Are you sure you want to delete "${file.name}"? This action cannot be undone.`,
                    destructive: true,
                    confirmLabel: 'Delete',
                    context: file,
                    action: 'fileViewer-delete'
                });
                break;

            case 'favorite':
                try {
                    const action = file.isFavorited ? 'remove' : 'add';
                    await api.post('/api/user/favorites', {
                        fileId: file.id,
                        action
                    });

                    setFiles(prev => prev.map(f =>
                        f.path === file.path ? { ...f, isFavorited: !f.isFavorited } : f
                    ));
                    refreshContent();
                } catch (error) {
                    console.error('Error updating favorite status:', error);
                }
                break;

            case 'properties':
                toast?.addInfo('Open properties panel (placeholder)');
                break;
        }
    };

    const handleFolderDoubleClick = (folder) => {
        onFolderDoubleClick(folder.path);
    };

    const handleFileDoubleClick = (file) => {
        // On desktop or if mobile double-click is somehow triggered, handle it
        if (isViewableFile(file.name)) {
            openFileViewer(file);
        } else {
            downloadFile(file.path, file.name);
        }
    };

    const handleContextMenuAction = async (action, items) => {
        switch (action) {
            case 'open':
                if (items[0].type === 'folder') handleFolderDoubleClick(items[0]);
                else if (isViewableFile(items[0].name)) openFileViewer(items[0]);
                else downloadFile(items[0].path, items[0].name);
                break;

            case 'download': {
                openConfirm({
                    title: 'Download Files',
                    message: 'Download directly to this device?\n\nChoose Confirm to download locally. Choose Cancel to generate a QR code for mobile download.',
                    confirmLabel: 'Download Here',
                    cancelLabel: 'QR Code',
                    context: items,
                    action: 'context-download-mode'
                });
                break;
            }

            case 'download-qr':
                generateQRCode('download', items);
                break;

            case 'upload-qr':
                generateQRCode('upload', []);
                break;

            case 'rename':
                setRenaming({ active: true, items, value: items[0].name });
                break;

            case 'delete':
                openConfirm({
                    title: `Delete ${items.length} Item${items.length > 1 ? 's' : ''}`,
                    message: `Are you sure you want to delete ${items.length} item(s)? This cannot be undone.`,
                    destructive: true,
                    confirmLabel: 'Delete',
                    context: items,
                    action: 'context-delete'
                });
                break;

            case 'favorite':
                if (items.length === 1) {
                    const item = items[0];
                    const favoriteAction = item.isFavorited ? 'remove' : 'add';
                    try {
                        await api.post('/api/user/favorites', {
                            fileId: item.type === 'file' ? item.id : undefined,
                            folderId: item.type === 'folder' ? item.id : undefined,
                            action: favoriteAction
                        });

                        if (item.type === 'file') {
                            setFiles(prev => prev.map(f =>
                                f.path === item.path ? { ...f, isFavorited: !f.isFavorited } : f
                            ));
                        } else {
                            setFolders(prev => prev.map(f =>
                                f.path === item.path ? { ...f, isFavorited: !f.isFavorited } : f
                            ));
                        }

                        refreshContent();
                    } catch (error) {
                        console.error('Error updating favorite status:', error);
                        toast?.addError('Failed to update favorite');
                    }
                } else {
                    openConfirm({
                        title: 'Add Favorites',
                        message: `Add ${items.length} items to favorites?`,
                        confirmLabel: 'Add',
                        context: items,
                        action: 'favorite-multi-add'
                    });
                }
                break;

            case 'add-favorite':
                for (const item of items) {
                    if (!item.isFavorited) {
                        try {
                            await api.post('/api/user/favorites', {
                                fileId: item.type === 'file' ? item.id : undefined,
                                folderId: item.type === 'folder' ? item.id : undefined,
                                action: 'add'
                            });

                            if (item.type === 'file') {
                                setFiles(prev => prev.map(f =>
                                    f.path === item.path ? { ...f, isFavorited: true } : f
                                ));
                            } else {
                                setFolders(prev => prev.map(f =>
                                    f.path === item.path ? { ...f, isFavorited: true } : f
                                ));
                            }
                        } catch (error) {
                            console.error('Error adding to favorites:', error);
                        }
                    }
                }
                refreshContent();
                break;

            case 'remove-favorite':
                openConfirm({
                    title: 'Remove Favorites',
                    message: `Remove ${items.length === 1 ? `"${items[0].name}"` : `${items.length} items`} from favorites?`,
                    confirmLabel: 'Remove',
                    context: { items, fromFavoritesPath: currentPath === 'favorites' },
                    action: 'favorite-multi-remove'
                });
                break;

            case 'properties':
                toast?.addInfo('Open properties panel (placeholder)');
                break;

            default:
                break;
        }
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentPath !== 'favorites') setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (currentPath === 'favorites') return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0 && onFilesUpload) {
            onFilesUpload(files);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };
    useEffect(() => {
        if (onSelectionChange) {
            const selectedPaths = Array.from(selectedItems);
            const allItems = [...folders, ...files];
            const selectedItemsData = allItems.filter(item => selectedPaths.includes(item.path));
            onSelectionChange(selectedItemsData);
        }
    }, [selectedItems, folders, files, onSelectionChange]);
    const sortItems = (items, sortBy) => {
        return [...items].sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'date':
                case 'modified':
                    return new Date(b.modified || 0) - new Date(a.modified || 0);
                case 'type':
                    // For folders, always sort by name
                    if (a.type === 'folder' && b.type === 'folder') {
                        return a.name.localeCompare(b.name);
                    }
                    // Folders come first
                    if (a.type === 'folder' && b.type !== 'folder') return -1;
                    if (a.type !== 'folder' && b.type === 'folder') return 1;

                    // For files, sort by file extension first, then by name
                    const aExt = a.name.split('.').pop()?.toLowerCase() || '';
                    const bExt = b.name.split('.').pop()?.toLowerCase() || '';

                    if (aExt !== bExt) {
                        return aExt.localeCompare(bExt);
                    }
                    return a.name.localeCompare(b.name);
                case 'size':
                    if (a.type === 'folder' && b.type !== 'folder') return -1;
                    if (a.type !== 'folder' && b.type === 'folder') return 1;
                    return (b.size || 0) - (a.size || 0);
                default:
                    return a.name.localeCompare(b.name);
            }
        });
    };

    if (loading) {
        return <SoftLoading />;
    }
    // Safety filter: ensure internal .thumbnails cache never surfaces in UI even if backend missed it
    const filteredFolders = folders.filter(f => f.name !== '.thumbnails' && !f.path.endsWith('/.thumbnails'));
    const filteredFiles = files.filter(f => !f.path.includes('/.thumbnails/') && !f.name.startsWith('.thumbnails'));
    const sortedFolders = sortItems(filteredFolders, sortBy);
    const sortedFiles = sortItems(filteredFiles, sortBy);

    return (
        <div
            className={`${styles.fileList} ${isDragOver ? styles.dragOver : ''} ${mobile ? styles.mobile : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Header - only show in list and details view */}
            {viewMode === 'details' && (
                <div className={styles.header}>
                    <div className={styles.headerCell} style={{ width: `${columnWidths.name}%` }}>
                        Name
                        <div
                            className={styles.resizeHandle}
                            onMouseDown={(e) => handleResizeStart(e, 'name')}
                        />
                    </div>
                    <div className={styles.headerCell} style={{ width: `${columnWidths.dateModified}%` }}>
                        Date modified
                        <div
                            className={styles.resizeHandle}
                            onMouseDown={(e) => handleResizeStart(e, 'dateModified')}
                        />
                    </div>
                    <div className={styles.headerCell} style={{ width: `${columnWidths.type}%` }}>
                        Type
                        <div
                            className={styles.resizeHandle}
                            onMouseDown={(e) => handleResizeStart(e, 'type')}
                        />
                    </div>
                    <div className={styles.headerCell} style={{ width: `${columnWidths.size}%` }}>
                        Size
                    </div>
                </div>
            )}

            <div className={`${styles.content} ${styles[viewMode]}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {sortedFolders.map(folder => {
                    const isIconView = ['extraLargeIcons', 'largeIcons', 'mediumIcons', 'smallIcons'].includes(viewMode);
                    const isTilesView = viewMode === 'tiles';
                    const isGridView = viewMode === 'grid';
                    const isListOrDetailsView = ['list', 'details'].includes(viewMode);

                    return (
                        <div
                            key={`folder-${folder.path}`}
                            className={`${styles.item} ${selectedItems.has(folder.path) ? styles.selected : ''}`}
                            onClick={(e) => handleItemClick(folder, e)}
                            onDoubleClick={() => handleFolderDoubleClick(folder)}
                            onContextMenu={(e) => handleItemRightClick(folder, e)}
                            style={{
                                cursor: 'pointer',
                                opacity: 1
                            }}
                        >
                            {isIconView ? (
                                <>
                                    <div className={styles.iconVisualRegion}>
                                        <div className={styles.itemVisualWrapper}>
                                            <div className={`${styles.itemIcon} ${styles.folderIcon}`}>
                                                <FolderClosed size={48} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`${styles.iconNameRegion} ${styles.itemName}`}>
                                        {renaming.active && renaming.items.length > 0 && renaming.items[0].path === folder.path ? (
                                            <input
                                                ref={renameInputRef}
                                                className={styles.renameInput}
                                                value={renaming.value}
                                                autoFocus
                                                onChange={handleRenameInput}
                                                onBlur={cancelRename}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") submitRename();
                                                    if (e.key === "Escape") cancelRename();
                                                }}
                                            />
                                        ) : (
                                            <span
                                                className={styles.overflowClamp}
                                                data-tooltip={folder.name}
                                            >{folder.name}</span>
                                        )}
                                        {folder.isFavorited && <span className={styles.favoriteIcon}><Star size={13} fill="currentColor" /></span>}
                                    </div>
                                </>
                            ) : isTilesView ? (
                                <>
                                    <div className={styles.thumbWrapper}>
                                        <div className={styles.fallbackIcon}><FolderClosed size={40} /></div>
                                    </div>
                                    <div className={styles.itemContent}>
                                        <div className={styles.itemName}>
                                            {renaming.active && renaming.items.length > 0 && renaming.items[0].path === folder.path ? (
                                                <input
                                                    ref={renameInputRef}
                                                    className={styles.renameInput}
                                                    value={renaming.value}
                                                    autoFocus
                                                    onChange={handleRenameInput}
                                                    onBlur={cancelRename}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") submitRename();
                                                        if (e.key === "Escape") cancelRename();
                                                    }}
                                                />
                                            ) : (
                                                <span
                                                    className={styles.overflowClamp}
                                                    data-tooltip={folder.name}
                                                >{folder.name}</span>
                                            )}
                                            {folder.isFavorited && <span className={styles.favoriteIcon}><Star size={13} fill="currentColor" /></span>}
                                        </div>
                                        <div className={styles.itemDetails}>
                                            File folder
                                        </div>
                                    </div>
                                </>
                            ) : isGridView ? (
                                <div className={styles.gridFolder}>
                                    <div className={styles.itemIcon}><FolderClosed size={16} /></div>
                                    <div className={styles.itemContent}>
                                        <div className={styles.itemName}>
                                            {renaming.active && renaming.items.length > 0 && renaming.items[0].path === folder.path ? (
                                                <input
                                                    ref={renameInputRef}
                                                    className={styles.renameInput}
                                                    value={renaming.value}
                                                    autoFocus
                                                    onChange={handleRenameInput}
                                                    onBlur={cancelRename}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") submitRename();
                                                        if (e.key === "Escape") cancelRename();
                                                    }}
                                                />
                                            ) : (
                                                <span
                                                    className={styles.overflowClamp}
                                                    data-tooltip={folder.name}
                                                >{folder.name}</span>
                                            )}
                                            {folder.isFavorited && <span className={styles.favoriteIcon}><Star size={13} fill="currentColor" /></span>}
                                        </div>
                                    </div>
                                </div>
                            ) : isListOrDetailsView ? (
                                <>
                                    <div className={`${styles.cell} ${styles.nameCell}`} style={{ width: `${columnWidths.name}%` }}>
                                        <span className={styles.itemIcon}><FolderClosed size={16} /></span>
                                        {renaming.active && renaming.items.length > 0 && renaming.items[0].path === folder.path ? (
                                            <input
                                                ref={renameInputRef}
                                                className={styles.renameInput}
                                                value={renaming.value}
                                                autoFocus
                                                onChange={handleRenameInput}
                                                onBlur={cancelRename}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") submitRename();
                                                    if (e.key === "Escape") cancelRename();
                                                }}
                                            />
                                        ) : (
                                            <span className={styles.itemName} style={{
                                                fontWeight: 'bold',
                                                color: 'inherit'
                                            }}>
                                                <span
                                                    className={styles.overflowClamp}
                                                    data-tooltip={folder.name}
                                                >{folder.name}</span>
                                            </span>
                                        )}
                                        {folder.isFavorited && <span className={styles.favoriteIcon}><Star size={13} fill="currentColor" /></span>}
                                    </div>
                                    {viewMode === 'details' && (
                                        <>
                                            <div className={styles.cell} style={{ width: `${columnWidths.dateModified}%` }}>
                                                {formatDate(folder.modified || folder.updatedAt || folder.modifiedAt || folder.createdAt)}
                                            </div>
                                            <div className={styles.cell} style={{ width: `${columnWidths.type}%` }}>
                                                File folder
                                            </div>
                                            <div className={styles.cell} style={{ width: `${columnWidths.size}%` }}>
                                                —
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : null}
                        </div>
                    );
                })}

                {sortedFiles.map(file => {
                    const isIconView = ['extraLargeIcons', 'largeIcons', 'mediumIcons', 'smallIcons'].includes(viewMode);
                    const isTilesView = viewMode === 'tiles';
                    const isGridView = viewMode === 'grid';
                    const isListOrDetailsView = ['list', 'details'].includes(viewMode);

                    return (
                        <div
                            key={`file-${file.path}`}
                            className={`${styles.item} ${selectedItems.has(file.path) ? styles.selected : ''}`}
                            onClick={(e) => handleItemClick(file, e)}
                            onDoubleClick={() => handleFileDoubleClick(file)}
                            onContextMenu={(e) => handleItemRightClick(file, e)}
                        >
                            {isIconView ? (
                                <>
                                    <div className={styles.iconVisualRegion}>
                                        <div className={styles.itemVisualWrapper}>
                                            {isImage(file.name) ? (
                                                <ThumbnailWithLoader cacheRef={thumbnailCacheRef} src={getPreviewUrl(file, currentPath)} alt={file.name} />
                                            ) : isVideo(file.name) ? (
                                                <ThumbnailWithLoader cacheRef={thumbnailCacheRef} src={getVideoThumbnailUrl(file, currentPath)} alt={file.name} />
                                            ) : (
                                                <div className={`${styles.itemIcon} ${styles.fileIcon}`}>{getFileIcon(file.name, 48)}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`${styles.iconNameRegion} ${styles.itemName}`}>
                                        {renaming.active && renaming.items.length > 0 && renaming.items[0].path === file.path ? (
                                            <input
                                                ref={renameInputRef}
                                                className={styles.renameInput}
                                                value={renaming.value}
                                                autoFocus
                                                onChange={handleRenameInput}
                                                onBlur={cancelRename}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") submitRename();
                                                    if (e.key === "Escape") cancelRename();
                                                }}
                                            />
                                        ) : (
                                            <span
                                                className={styles.overflowClamp}
                                                data-tooltip={file.name}
                                            >{file.name}</span>
                                        )}
                                        {file.isFavorited && <span className={styles.favoriteIcon}><Star size={13} fill="currentColor" /></span>}
                                    </div>
                                </>
                            ) : isTilesView ? (
                                <>
                                    <div className={styles.thumbWrapper}>
                                        {isImage(file.name) ? (
                                            <ThumbnailWithLoader cacheRef={thumbnailCacheRef} src={getPreviewUrl(file, currentPath)} alt={file.name} />
                                        ) : isVideo(file.name) ? (
                                            <ThumbnailWithLoader cacheRef={thumbnailCacheRef} src={getVideoThumbnailUrl(file, currentPath)} alt={file.name} />
                                        ) : (
                                            <div className={styles.fallbackIcon}>{getFileIcon(file.name, 40)}</div>
                                        )}
                                    </div>
                                    <div className={styles.itemContent}>
                                        <div className={styles.itemName}>
                                            {renaming.active && renaming.items.length > 0 && renaming.items[0].path === file.path ? (
                                                <input
                                                    ref={renameInputRef}
                                                    className={styles.renameInput}
                                                    value={renaming.value}
                                                    autoFocus
                                                    onChange={handleRenameInput}
                                                    onBlur={cancelRename}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") submitRename();
                                                        if (e.key === "Escape") cancelRename();
                                                    }}
                                                />
                                            ) : (
                                                <span
                                                    className={styles.overflowClamp}
                                                    data-tooltip={file.name}
                                                >{file.name}</span>
                                            )}
                                            {file.isFavorited && <span className={styles.favoriteIcon}><Star size={13} fill="currentColor" /></span>}
                                        </div>
                                        <div className={styles.itemDetails}>
                                            {getFileType(file.name)}<br />
                                            {formatFileSize(file.size)}
                                        </div>
                                    </div>
                                </>
                            ) : isGridView ? (
                                <div className={styles.gridFile}>
                                    <div className={styles.gridFileHeader}>
                                        <div className={styles.gridFileName}>
                                            {renaming.active && renaming.items.length > 0 && renaming.items[0].path === file.path ? (
                                                <input
                                                    ref={renameInputRef}
                                                    className={styles.renameInput}
                                                    value={renaming.value}
                                                    autoFocus
                                                    onChange={handleRenameInput}
                                                    onBlur={cancelRename}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") submitRename();
                                                        if (e.key === "Escape") cancelRename();
                                                    }}
                                                />
                                            ) : (
                                                <span
                                                    className={styles.overflowClamp}
                                                    data-tooltip={file.name}
                                                >{file.name}</span>
                                            )}
                                            {file.isFavorited && <span className={styles.favoriteIcon}><Star size={13} fill="currentColor" /></span>}
                                        </div>
                                        <div className={styles.gridFileSize}>
                                            {formatFileSize(file.size)}
                                        </div>
                                    </div>
                                    <div className={styles.gridFileContent}>
                                        {(isImage(file.name) || isVideo(file.name)) ? (
                                            <div className={styles.itemPreview}>
                                                {isImage(file.name) ? (
                                                    <img
                                                        src={getPreviewUrl(file, currentPath)}
                                                        alt={file.name}
                                                        className={styles.previewImage}
                                                    />
                                                ) : (
                                                    <video
                                                        src={`/api/files/download?path=${encodeURIComponent(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`)}`}
                                                        className={styles.previewVideo}
                                                        muted
                                                        playsInline
                                                        preload="metadata"
                                                        onLoadedData={(e) => {
                                                            e.target.currentTime = 0;
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <div className={styles.itemIcon}>
                                                {getFileIcon(file.name, 64)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : isListOrDetailsView ? (
                                <>
                                    <div className={`${styles.cell} ${styles.nameCell}`} style={{ width: `${columnWidths.name}%` }}>
                                        <span className={styles.itemIcon}>
                                            {getFileIcon(file.name, 16)}
                                        </span>
                                        {renaming.active && renaming.items.length > 0 && renaming.items[0].path === file.path ? (
                                            <input
                                                ref={renameInputRef}
                                                className={styles.renameInput}
                                                value={renaming.value}
                                                autoFocus
                                                onChange={handleRenameInput}
                                                onBlur={cancelRename}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") submitRename();
                                                    if (e.key === "Escape") cancelRename();
                                                }}
                                            />
                                        ) : (
                                            <span className={styles.itemName}>
                                                <span
                                                    className={styles.overflowClamp}
                                                    data-tooltip={file.name}
                                                >{file.name}</span>
                                            </span>
                                        )}
                                        {file.isFavorited && <span className={styles.favoriteIcon}><Star size={13} fill="currentColor" /></span>}
                                    </div>
                                    {viewMode === 'details' && (
                                        <>
                                            <div className={styles.cell} style={{ width: `${columnWidths.dateModified}%` }}>
                                                {formatDate(file.modified || file.modifiedAt || file.createdAt)}
                                            </div>
                                            <div className={styles.cell} style={{ width: `${columnWidths.type}%` }}>
                                                {getFileType(file.name)}
                                            </div>
                                            <div className={styles.cell} style={{ width: `${columnWidths.size}%` }}>
                                                {formatFileSize(file.size)}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            {loading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner}></div>
                </div>
            )}

            {isDragOver && (
                <div className={styles.dragOverlay}>
                    <div className={styles.dragMessage}>
                        Drop files here to upload
                    </div>
                </div>
            )}

            {contextMenu.visible && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    isVisible={contextMenu.visible}
                    selectedItems={contextMenu.items}
                    onAction={handleContextMenuAction}
                    currentPath={currentPath}
                    onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
                />
            )}

            {fileViewer.isOpen && (
                <FileViewer
                    isOpen={fileViewer.isOpen}
                    currentFileIndex={fileViewer.currentIndex}
                    files={fileViewer.files}
                    onClose={() => setFileViewer(prev => ({ ...prev, isOpen: false }))}
                    onNavigate={(newIndex) => setFileViewer(prev => ({ ...prev, currentIndex: newIndex }))}
                    onAction={handleFileViewerAction}
                    mobile={mobile}
                />
            )}

            {qrModal.visible && (
                <div className={styles.qrModalOverlay}>
                    <div className={styles.qrModal}>
                        <div className={styles.qrModalHeader}>
                            <h3>
                                {qrModal.type === 'download' ? 'Download Files via QR Code' : 'Upload Files via QR Code'}
                            </h3>
                            <button
                                className={styles.qrModalClose}
                                onClick={() => setQrModal({ visible: false, type: '', qrCode: '', items: [] })}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.qrModalContent}>
                            <div className={styles.qrCodeContainer}>
                                <img src={qrModal.qrCode} alt="QR Code" className={styles.qrCodeImage} />
                            </div>
                            <div className={styles.qrInstructions}>
                                <p>
                                    {qrModal.type === 'download'
                                        ? 'Scan this QR code with your mobile device to download the selected files.'
                                        : 'Scan this QR code with your mobile device to upload files to this folder.'
                                    }
                                </p>
                                <p><strong>This QR code expires in 1 hour.</strong></p>
                                <p>No login required on mobile device.</p>
                                {qrModal.type === 'download' && qrModal.items.length > 0 && (
                                    <div className={styles.qrFileList}>
                                        <p><strong>Files to download:</strong></p>
                                        <ul>
                                            {qrModal.items.map((item, index) => (
                                                <li key={index}>{item.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
});

export default FileList;
