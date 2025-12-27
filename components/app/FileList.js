// components/app/FileList.js
"use client";

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from "react";
import { api } from "@/utils/api";
import { downloadFile, downloadFolder } from "@/utils/downloadUtils";
import styles from "./FileList.module.css";
import SoftLoading from "@/components/SoftLoading";
import { ContextMenu } from "./ContextMenu";
import { ConfirmModal } from "./ConfirmModal";
import { useToast } from './ToastProvider';
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
    Star
} from 'lucide-react';

function createConcurrencyQueue(maxConcurrency) {
    let active = 0;
    const waiting = [];
    const api = {
        maxConcurrency,
        setConcurrency(newMax) {
            api.maxConcurrency = newMax;
            api._drain();
        },
        enqueue(task) {
            return api._push(task);
        },
        _drain() {
            while (active < api.maxConcurrency && waiting.length) {
                const { task, resolveRelease } = waiting.shift();
                active++;
                Promise.resolve(task()).finally(() => {
                    active--;
                    resolveRelease();
                    api._drain();
                });
            }
        }
    };
    api._push = function (task) {
        let freed = false;
        let externalResolve;
        const releasePromise = new Promise(r => { externalResolve = r; });
        const entry = {
            task: async () => {
                try { await task(); } finally { freed = true; }
            },
            resolveRelease: () => { externalResolve(); }
        };
        waiting.push(entry);
        api._drain();
        return () => {
            if (!freed) {
                const idx = waiting.indexOf(entry);
                if (idx !== -1) waiting.splice(idx, 1);
            }
        };
    };
    return api;
}

const ThumbnailWithLoader = ({ src, alt, cacheRef, queue, currentPath }) => {
    const cacheKey = `${currentPath}||${src}`;
    const [loaded, setLoaded] = useState(() => cacheRef?.current?.has(cacheKey));
    const [inView, setInView] = useState(false);
    const [canStart, setCanStart] = useState(false);
    const [error, setError] = useState(false);
    const rootRef = useRef(null);
    const imgRef = useRef(null);
    const observerRef = useRef(null);

    useEffect(() => {
        setLoaded(cacheRef?.current?.has(cacheKey));
        setError(false);
        setCanStart(false);
        setInView(false);
    }, [cacheKey, cacheRef]);

    useEffect(() => {
        if (!rootRef.current) return;

        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        if ('IntersectionObserver' in window) {

            observerRef.current = new IntersectionObserver(entries => {
                const entry = entries[0];
                if (entry.isIntersecting) {
                    setInView(true);
                } else {
                    setInView(false);
                }
            }, { rootMargin: '100px 0px 100px 0px', threshold: 0.01 });

            observerRef.current.observe(rootRef.current);
        } else {
            setInView(true);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        if (!src || loaded || !inView || error) return;
        let cancelled = false;
        const release = queue?.enqueue?.(async () => {
            if (!cancelled && inView) setCanStart(true);
        });
        return () => { cancelled = true; release?.(); };
    }, [src, loaded, inView, queue, error]);

    const handleLoad = () => {
        if (cacheRef?.current && !cacheRef.current.has(cacheKey)) {
            cacheRef.current.set(cacheKey, true);
        }
        setLoaded(true);
        setError(false);
    };

    const handleError = () => {
        setError(true);
        setLoaded(true);
        if (imgRef.current) {
            imgRef.current.style.display = 'none';
        }
    };

    return (
        <div ref={rootRef} style={{ position: 'relative' }}>
            {!loaded && inView && <div className={styles.thumbLoader}><SoftLoading /></div>}
            {canStart && !error && (
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    className={styles.thumbnailImage}
                    loading="lazy"
                    decoding="async"
                    style={!loaded ? { visibility: 'hidden', position: 'absolute' } : {}}
                    onLoad={handleLoad}
                    onError={handleError}
                />
            )}
        </div>
    );
};

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

let getPreviewUrl = (file, currentPath) => null;
let getVideoThumbnailUrl = (file, currentPath) => null;

const FileList = forwardRef(({
    socket,
    currentPath,
    onFolderDoubleClick,
    onContentChange,
    onSelectionChange,
    onFilesUpload,
    onProperties,
    onNavigateToFile,
    sortBy = 'name',
    viewMode = 'list',
    user,
    mobile = false,
}, ref) => {
    const toast = (() => { try { return useToast(); } catch { return null; } })();

    const thumbnailCacheRef = useRef(new Map());
    const thumbnailQueueRef = useRef();

    const optimalConcurrency = 6;
    if (!thumbnailQueueRef.current) thumbnailQueueRef.current = createConcurrencyQueue(optimalConcurrency);
    else if (thumbnailQueueRef.current.maxConcurrency !== optimalConcurrency) thumbnailQueueRef.current.setConcurrency(optimalConcurrency);

    useEffect(() => {
        const cache = thumbnailCacheRef.current;
        const pathPrefix = `${currentPath}||`;
        for (const [key] of cache) {
            if (!key.startsWith(pathPrefix)) {
                cache.delete(key);
            }
        }
        if (cache.size > 1000) {
            const entries = Array.from(cache.entries());
            const toDelete = entries.slice(0, Math.floor(entries.length / 2));
            toDelete.forEach(([key]) => cache.delete(key));
        }
    }, [currentPath]);

    getPreviewUrl = useCallback((file, path) => {
        if (isImage(file.name)) {
            const fullPath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;
            const mod = file.modified || file.modifiedAt || file.updatedAt || file.createdAt || '';
            const v = mod ? new Date(mod).getTime() : '';
            return `/api/files/thumbnail?path=${encodeURIComponent(fullPath)}${v ? `&v=${v}` : ''}&size=medium`;
        }
        return null;
    }, []);
    getVideoThumbnailUrl = useCallback((file, path) => {
        if (isVideo(file.name)) {
            const fullPath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;
            const mod = file.modified || file.modifiedAt || file.updatedAt || file.createdAt || '';
            const v = mod ? new Date(mod).getTime() : '';
            return `/api/files/video-thumbnail?path=${encodeURIComponent(fullPath)}${v ? `&v=${v}` : ''}&size=medium`;
        }
        return null;
    }, []);
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

    const [columnWidths, setColumnWidths] = useState({
        name: 360,
        dateModified: 220,
        type: 180,
        size: 120
    });
    const COLUMN_STORAGE_KEY = 'filelist:details:columnWidths:v1';
    const minColumnWidths = {
        name: 160,
        dateModified: 160,
        type: 120,
        size: 100
    };

    const [resizing, setResizing] = useState({
        isResizing: false,
        startX: 0,
        startWidth: 0,
        column: null
    });

    useEffect(() => {
        try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem(COLUMN_STORAGE_KEY) : null;
            if (raw) {
                const saved = JSON.parse(raw);
                const next = {
                    name: Math.max(minColumnWidths.name, Number(saved.name) || 360),
                    dateModified: Math.max(minColumnWidths.dateModified, Number(saved.dateModified) || 220),
                    type: Math.max(minColumnWidths.type, Number(saved.type) || 180),
                    size: Math.max(minColumnWidths.size, Number(saved.size) || 120)
                };
                setColumnWidths(next);
            }
        } catch { }

    }, []);

    useEffect(() => {
        let t;
        try {
            t = setTimeout(() => {
                localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columnWidths));
            }, 200);
        } catch { }
        return () => { if (t) clearTimeout(t); };
    }, [columnWidths]);

    const [renaming, setRenaming] = useState({ active: false, items: [], value: "" });
    const [qrModal, setQrModal] = useState({ visible: false, type: '', qrCode: '', items: [], loading: false });
    const renameInputRef = useRef(null);

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
        const target = resizing.column;
        const proposed = Math.max(minColumnWidths[target], resizing.startWidth + deltaX);
        setColumnWidths(prev => ({ ...prev, [target]: proposed }));
    }, [resizing]);

    const handleResizeEnd = useCallback(() => {
        setResizing({
            isResizing: false,
            startX: 0,
            startWidth: 0,
            column: null
        });
    }, []);

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

    const measureCanvasRef = useRef(null);
    const ensureMeasureCtx = () => {
        if (!measureCanvasRef.current) {
            const c = document.createElement('canvas');
            measureCanvasRef.current = c.getContext('2d');
        }
        return measureCanvasRef.current;
    };
    const measureText = (text, font = '13px system-ui, -apple-system, Segoe UI, Roboto, Arial') => {
        const ctx = ensureMeasureCtx();
        if (!ctx) return text.length * 8 + 16;
        ctx.font = font;
        return ctx.measureText(String(text)).width;
    };
    const autoSizeColumn = (column) => {
        try {
            const padding = column === 'name' ? 56 : 28;
            const headerLabel = column === 'name' ? 'Name' : column === 'dateModified' ? 'Date modified' : column === 'type' ? 'Type' : 'Size';
            let maxW = measureText(headerLabel);
            const items = [...folders, ...files];
            for (const it of items) {
                let text = '';
                switch (column) {
                    case 'name': text = it.name || ''; break;
                    case 'dateModified': text = formatDate(it.modified || it.updatedAt || it.createdAt) || ''; break;
                    case 'type': text = it.type === 'folder' ? 'File folder' : getFileType(it.name); break;
                    case 'size': text = it.type === 'folder' ? '—' : formatFileSize(it.size || 0); break;
                }
                const w = measureText(text);
                if (w > maxW) maxW = w;
            }
            const proposed = Math.max(minColumnWidths[column], Math.ceil(maxW + padding));
            setColumnWidths(prev => ({ ...prev, [column]: proposed }));
        } catch { }
    };

    useEffect(() => {
        if (!socket) return;

        const handleFavoritesUpdated = () => {
            if (currentPath === 'favorites') {
                refreshContent();
            }
        };

        socket.on('favorites-updated', handleFavoritesUpdated);

        return () => {
            socket.off('favorites-updated', handleFavoritesUpdated);
        };
    }, [socket, currentPath]);

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

            toast?.addError('Error renaming');
        }

        cancelRename();
    };

    const cancelRename = () => {
        setRenaming({ active: false, items: [], value: "" });
    };

    const generateQRCode = async (type, items) => {
        setQrModal({
            visible: true,
            type,
            qrCode: null,
            items,
            loading: true
        });

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
                    items,
                    loading: false
                });
                toast?.addSuccess(type === 'download' ? 'QR code ready (download)' : 'QR code ready (upload)');
            } else {
                setQrModal({ visible: false, type: null, qrCode: null, items: [], loading: false });
                toast?.addError('Failed to generate QR code');
            }
        } catch (error) {
            setQrModal({ visible: false, type: null, qrCode: null, items: [], loading: false });
            toast?.addError('Error generating QR code');
        }
    };

    const loadContents = useCallback(async () => {
        if (currentPath === 'favorites') return;
        setLoading(true);
        try {

            const cacheParam = process.env.NODE_ENV === 'development' ? `&_t=${Date.now()}` : '';
            const data = await api.get(`/api/files?path=${encodeURIComponent(currentPath)}${cacheParam}`);
            setFolders(data.folders || []);
            setFiles((data.files || []).map(f => ({
                ...f,
                size: f.size && typeof f.size !== 'number' ? Number(f.size) : f.size
            })));
            setSelectedItems(new Set());
            setLastSelectedItem(null);
        } catch (error) {
            console.error('Error loading file contents:', error);
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
    }, [currentPath, loadContents]);

    useImperativeHandle(ref, () => ({
        triggerFavorite: (items) => {
            handleContextMenuAction('favorite', items);
        },
        refresh: refreshContent,
        generateQRCode: (type, items) => generateQRCode(type, items),
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

                        }
                    }
                });
        } else {
            loadContents();
        }
    }, [currentPath, loadContents]);

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

            loadContents();
            return;
        }

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
        if (mobile && item.type === 'folder' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            onFolderDoubleClick(item.path);
            return;
        }

        if (mobile && item.type === 'file' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            if (isViewableFile(item.name)) {
                openFileViewer(item);
            } else {
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
        } else if (event.shiftKey) {

            if (!lastSelectedItem) {

                setSelectedItems(new Set([item.path]));
                setLastSelectedItem(item);
            } else {
                const lastIndex = pathIndexMap.get(lastSelectedItem.path) ?? -1;
                const currentIndex = pathIndexMap.get(item.path) ?? -1;

                if (lastIndex !== -1 && currentIndex !== -1) {
                    const startIndex = Math.min(lastIndex, currentIndex);
                    const endIndex = Math.max(lastIndex, currentIndex);

                    const newSelected = new Set();

                    for (let i = startIndex; i <= endIndex; i++) {
                        newSelected.add(combinedSortedItems[i].path);
                    }

                    setSelectedItems(newSelected);
                }
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

                            if (socket && socket.emit) {
                                socket.emit('favorites-updated', { userId: user?.id });
                            }
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

                        if (socket && socket.emit) {
                            socket.emit('favorites-updated', { userId: user?.id });
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

                    if (socket && socket.emit) {
                        socket.emit('favorites-updated', { userId: user?.id });
                    }
                    refreshContent();
                } catch (error) {

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

                        if (socket && socket.emit) {
                            socket.emit('favorites-updated', { userId: user?.id });
                        }

                        refreshContent();
                    } catch (error) {

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

                        }
                    }
                }

                if (socket && socket.emit) {
                    socket.emit('favorites-updated', { userId: user?.id });
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
                if (onProperties) {
                    onProperties(items);
                } else {
                    toast?.addInfo('Properties function not available');
                }
                break;

            case 'go-to-location':
                if (items.length === 1 && items[0].path && onNavigateToFile) {

                    const filePath = items[0].path;
                    const dirPath = filePath.substring(0, filePath.lastIndexOf('/')) || '';
                    onNavigateToFile(dirPath);
                    toast?.addInfo(`Navigating to ${dirPath || 'root'}`);
                } else {
                    toast?.addError('Cannot navigate to file location');
                }
                break;

            default:
                break;
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
                    if (a.type === 'folder' && b.type === 'folder') {
                        return a.name.localeCompare(b.name);
                    }
                    if (a.type === 'folder' && b.type !== 'folder') return -1;
                    if (a.type !== 'folder' && b.type === 'folder') return 1;

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

    const filteredFolders = folders.filter(f => f.name !== '.thumbnails' && !f.path.endsWith('/.thumbnails'));
    const filteredFiles = files.filter(f => !f.path.includes('/.thumbnails/') && !f.name.startsWith('.thumbnails'));
    const sortedFolders = sortItems(filteredFolders, sortBy);
    const sortedFiles = sortItems(filteredFiles, sortBy);

    const combinedSortedItems = useMemo(() => [...sortedFolders, ...sortedFiles], [sortedFolders, sortedFiles]);
    const pathIndexMap = useMemo(() => {
        const map = new Map();
        combinedSortedItems.forEach((it, idx) => map.set(it.path, idx));
        return map;
    }, [combinedSortedItems]);

    const scrollContainerRef = useRef(null);
    const headerInnerRef = useRef(null);
    const [virtual, setVirtual] = useState({ start: 0, end: 0, itemHeight: 32, containerHeight: 0 });
    const totalColumnWidth = useMemo(() => (
        (columnWidths.name || 0) + (columnWidths.dateModified || 0) + (columnWidths.type || 0) + (columnWidths.size || 0)
    ), [columnWidths]);

    const isVirtualizableView = ['list', 'details'].includes(viewMode);
    const allRenderableItems = useMemo(() => isVirtualizableView ? [...sortedFolders, ...sortedFiles] : null, [isVirtualizableView, sortedFolders, sortedFiles]);
    const totalCount = allRenderableItems ? allRenderableItems.length : 0;

    useEffect(() => {
        if (!isVirtualizableView) return;
        const el = scrollContainerRef.current;
        if (!el) return;

        const measure = () => {
            const containerHeight = el.clientHeight;
            setVirtual(v => ({ ...v, containerHeight }));
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [isVirtualizableView]);

    useEffect(() => {
        if (!isVirtualizableView) return;
        const el = scrollContainerRef.current;
        if (!el) return;
        const handleScroll = () => {
            const scrollTop = el.scrollTop;
            const itemHeight = virtual.itemHeight;
            const containerHeight = el.clientHeight;
            const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
            const visibleCount = Math.ceil(containerHeight / itemHeight) + 20;
            const endIndex = Math.min(totalCount, startIndex + visibleCount);
            setVirtual(v => ({ ...v, start: startIndex, end: endIndex }));

            try {
                const left = el.scrollLeft || 0;
                if (headerInnerRef.current) headerInnerRef.current.style.transform = `translateX(${-left}px)`;
            } catch { }
        };
        el.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => el.removeEventListener('scroll', handleScroll);
    }, [isVirtualizableView, totalCount, virtual.itemHeight]);

    let virtualizedFolders = sortedFolders;
    let virtualizedFiles = sortedFiles;
    let topSpacer = 0;
    let bottomSpacer = 0;
    if (isVirtualizableView) {

        const start = virtual.start || 0;
        const end = virtual.end || 0;
        if (totalCount > 0) {
            const folderCount = sortedFolders.length;
            const fileCount = sortedFiles.length;
            const sliceIndices = { start, end };
            const sliceFoldersStart = Math.min(folderCount, sliceIndices.start);
            const sliceFoldersEnd = Math.min(folderCount, sliceIndices.end);
            virtualizedFolders = sortedFolders.slice(sliceFoldersStart, sliceFoldersEnd);
            const remainingStartInFiles = Math.max(0, sliceIndices.start - folderCount);
            const remainingEndInFiles = Math.max(0, sliceIndices.end - folderCount);
            virtualizedFiles = sortedFiles.slice(remainingStartInFiles, remainingEndInFiles);
            topSpacer = (sliceIndices.start) * virtual.itemHeight;
            bottomSpacer = (totalCount - sliceIndices.end) * virtual.itemHeight;
        }
    }

    if (loading) {
        return <SoftLoading />;
    }

    return (
        <div className={`${styles.fileList} ${mobile ? styles.mobile : ''}`}>
            {viewMode === 'details' && (
                <div className={styles.header}>
                    <div className={styles.headerTrack} ref={headerInnerRef} style={{ display: 'flex', position: 'relative', width: `${totalColumnWidth}px` }}>
                        <div className={styles.headerCell} style={{ width: `${columnWidths.name}px` }}>
                            Name
                            <div
                                className={styles.resizeHandle}
                                onMouseDown={(e) => handleResizeStart(e, 'name')}
                                onDoubleClick={() => autoSizeColumn('name')}
                            />
                        </div>
                        <div className={styles.headerCell} style={{ width: `${columnWidths.dateModified}px` }}>
                            Date modified
                            <div
                                className={styles.resizeHandle}
                                onMouseDown={(e) => handleResizeStart(e, 'dateModified')}
                                onDoubleClick={() => autoSizeColumn('dateModified')}
                            />
                        </div>
                        <div className={styles.headerCell} style={{ width: `${columnWidths.type}px` }}>
                            Type
                            <div
                                className={styles.resizeHandle}
                                onMouseDown={(e) => handleResizeStart(e, 'type')}
                                onDoubleClick={() => autoSizeColumn('type')}
                            />
                        </div>
                        <div className={styles.headerCell} style={{ width: `${columnWidths.size}px` }}>
                            Size
                            <div
                                className={styles.resizeHandle}
                                onMouseDown={(e) => handleResizeStart(e, 'size')}
                                onDoubleClick={() => autoSizeColumn('size')}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div ref={scrollContainerRef} className={`${styles.content} ${styles[viewMode]}`} style={viewMode === 'details' ? { overflowX: 'auto' } : undefined}>
                {isVirtualizableView && topSpacer > 0 && (
                    <div style={{ height: topSpacer, pointerEvents: 'none' }} />
                )}
                {(isVirtualizableView ? virtualizedFolders : sortedFolders).map(folder => {
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
                            style={{ cursor: 'pointer', opacity: 1, ...(viewMode === 'details' ? { width: `${totalColumnWidth}px` } : {}) }}
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
                                    <div className={`${styles.cell} ${styles.nameCell}`} style={{ width: `${columnWidths.name}px` }}>
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
                                            <div className={styles.cell} style={{ width: `${columnWidths.dateModified}px` }}>
                                                {formatDate(folder.modified || folder.updatedAt || folder.modifiedAt || folder.createdAt)}
                                            </div>
                                            <div className={styles.cell} style={{ width: `${columnWidths.type}px` }}>
                                                File folder
                                            </div>
                                            <div className={styles.cell} style={{ width: `${columnWidths.size}px` }}>
                                                —
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : null}
                        </div>
                    );
                })}

                {(isVirtualizableView ? virtualizedFiles : sortedFiles).map(file => {
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
                            style={viewMode === 'details' ? { width: `${totalColumnWidth}px` } : undefined}
                        >
                            {isIconView ? (
                                <>
                                    <div className={styles.iconVisualRegion}>
                                        <div className={styles.itemVisualWrapper}>
                                            {isImage(file.name) ? (
                                                <ThumbnailWithLoader queue={thumbnailQueueRef.current} cacheRef={thumbnailCacheRef} src={getPreviewUrl(file, currentPath)} alt={file.name} currentPath={currentPath} />
                                            ) : isVideo(file.name) ? (
                                                <ThumbnailWithLoader queue={thumbnailQueueRef.current} cacheRef={thumbnailCacheRef} src={getVideoThumbnailUrl(file, currentPath)} alt={file.name} currentPath={currentPath} />
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
                                            <ThumbnailWithLoader queue={thumbnailQueueRef.current} cacheRef={thumbnailCacheRef} src={getPreviewUrl(file, currentPath)} alt={file.name} currentPath={currentPath} />
                                        ) : isVideo(file.name) ? (
                                            <ThumbnailWithLoader queue={thumbnailQueueRef.current} cacheRef={thumbnailCacheRef} src={getVideoThumbnailUrl(file, currentPath)} alt={file.name} currentPath={currentPath} />
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
                                                    <ThumbnailWithLoader queue={thumbnailQueueRef.current} cacheRef={thumbnailCacheRef} src={getPreviewUrl(file, currentPath)} alt={file.name} currentPath={currentPath} />
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
                                    <div className={`${styles.cell} ${styles.nameCell}`} style={{ width: `${columnWidths.name}px` }}>
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
                                            <div className={styles.cell} style={{ width: `${columnWidths.dateModified}px` }}>
                                                {formatDate(file.modified || file.modifiedAt || file.createdAt)}
                                            </div>
                                            <div className={styles.cell} style={{ width: `${columnWidths.type}px` }}>
                                                {getFileType(file.name)}
                                            </div>
                                            <div className={styles.cell} style={{ width: `${columnWidths.size}px` }}>
                                                {formatFileSize(file.size)}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : null}
                        </div>
                    );
                })}
                {isVirtualizableView && bottomSpacer > 0 && (
                    <div style={{ height: bottomSpacer, pointerEvents: 'none' }} />
                )}

            </div>

            {loading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner}></div>
                </div>
            )}

            <ConfirmModal
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                onCancel={() => {
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
                                onClick={() => setQrModal({ visible: false, type: '', qrCode: '', items: [], loading: false })}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.qrModalContent}>
                            {qrModal.loading ? (
                                <div className={styles.qrModalLoading}>
                                    <SoftLoading />
                                    <p>Generating QR code...</p>
                                </div>
                            ) : qrModal.qrCode ? (
                                <>
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
                                </>
                            ) : (
                                <p className={styles.qrError}>Failed to generate QR code. Please try again.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default FileList;

