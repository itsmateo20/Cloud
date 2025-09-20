// app/page.js
"use client";

import style from "@/public/styles/main.module.css";

import { useAuth } from "@/context/AuthProvider";
import { io } from "socket.io-client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";

import Layout from "@/components/Layout";
import { useToast } from '@/components/app/ToastProvider';
import FilePropertiesModal from '@/components/app/FilePropertiesModal';
import NewItemModal from '@/components/app/NewItemModal';
import FolderTree from "@/components/app/FolderTree";
import FileList from "@/components/app/FileList";
import Controls from "@/components/app/Controls";
import SoftLoading from "@/components/SoftLoading";

import { downloadFile, downloadFolder } from "@/utils/downloadUtils";
import { api } from "@/utils/api";
import { appendMetadataToFormData } from "@/utils/fileMetadata.client";
import { useIsMobile } from "@/utils/useIsMobile";

import { Resizable } from "re-resizable";
import { ArrowLeft, Check, EllipsisVertical, LayoutGrid, List, Plus, X, HardDrive, Star } from "lucide-react";
import ConfirmModal from '@/components/app/ConfirmModal';

let socket;

export default function Page() {
  const { user, loading } = useAuth();
  const fileListRef = useRef(null);
  const toast = useToast();

  const [currentPath, setCurrentPath] = useState(undefined);
  const [selectedItems, setSelectedItems] = useState([]);
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState("list");
  const [favorites, setFavorites] = useState({ files: [], folders: [] });
  const [storageInfo, setStorageInfo] = useState({ totalSize: 0, totalFiles: 0 });
  const [storageLoading, setStorageLoading] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showSortOptionsMenu, setShowSortOptionsMenu] = useState(false);
  const [sortMenuSwipePosition, setSortMenuSwipePosition] = useState(0);
  const [isSwipingSort, setIsSwipingSort] = useState(false);
  const [sortMenuInitialY, setSortMenuInitialY] = useState(0);
  const [showNewFolderPopup, setShowNewFolderPopup] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', action: '' });

  // Global drag & drop state
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);
  const [isDragInvalid, setIsDragInvalid] = useState(false);
  const dragCounterRef = useRef(0);
  const [propertiesState, setPropertiesState] = useState({ open: false, items: [] });

  const isMobile = useIsMobile();

  useEffect(() => {
    if (!socket) socket = io();

    if (isMobile) setCurrentPath(undefined);
    else setCurrentPath('');

    if (isMobile && user) {
      loadFavorites();
      loadStorageInfo();
    }

    const debounceMap = new Map();

    const schedule = (key, fn, wait = 160) => {
      if (debounceMap.get(key)) clearTimeout(debounceMap.get(key));
      const t = setTimeout(() => { fn(); debounceMap.delete(key); }, wait);
      debounceMap.set(key, t);
    };

    const handleFileUpdated = (payload) => {
      // Payloads emitted from rename endpoint provide parent path in path
      if (!fileListRef.current) return;
      const current = currentPath || '';
      switch (payload.action) {
        case 'rename':
        case 'delete':
        case 'create':
        case 'upload':
        case 'refresh':
        default:
          // For now just refresh if parent path matches
          if ((payload.path || '') === current) {
            schedule('refresh-current', () => fileListRef.current?.refresh?.());
          }
          break;
      }
    };

    const handleFolderStructure = (payload) => {
      if (!fileListRef.current) return;
      // If action pertains to current path (creation in current folder or rename affecting it) refresh
      if (payload?.path === currentPath || payload?.oldPath?.startsWith(currentPath || '') || payload?.newPath?.startsWith(currentPath || '')) {
        schedule('refresh-structure', () => fileListRef.current?.refresh?.());
      } else if (currentPath === '' && (payload?.path === '' || !payload?.path)) {
        schedule('refresh-root', () => fileListRef.current?.refresh?.());
      }
    };

    socket?.on('file-updated', handleFileUpdated);
    socket?.on('folder-structure-updated', handleFolderStructure);

    return () => {
      socket?.off('folder-structure-updated', handleFolderStructure);
      socket?.off('file-updated', handleFileUpdated);
      debounceMap.forEach(t => clearTimeout(t));
      socket = null;
    };
  }, [isMobile, user]);

  const loadFavorites = async () => {
    try {
      const response = await api.get('/api/user/favorites');
      if (response.success) {
        setFavorites({
          files: response.files || [],
          folders: response.folders || []
        });
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const loadStorageInfo = async () => {
    try {
      setStorageLoading(true);
      const response = await api.get('/api/user/storage-info');
      if (response.success) {
        setStorageInfo({
          totalSize: response.totalSize || 0,
          totalFiles: response.totalFiles || 0
        });
      }
    } catch (error) {
      console.error('Failed to load storage info:', error);
      setStorageInfo({
        totalSize: 0,
        totalFiles: 0
      });
    } finally {
      setStorageLoading(false);
    }
  };

  const handleFavoriteClick = (item) => {
    if (item.type === 'folder') {
      const pathParts = item.path.split('/');
      const parentPath = pathParts.slice(0, -1).join('/');
      setCurrentPath(parentPath);
    } else {
      const pathParts = item.path.split('/');
      const parentPath = pathParts.slice(0, -1).join('/');
      setCurrentPath(parentPath);
    }
  };

  const FavoriteFileItem = ({ file, onFavoriteClick }) => {
    const [imageLoading, setImageLoading] = useState(false);
    const thumbnail = getFileThumbnail(file);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isVideo = ['mp4', 'avi', 'mov', 'webm', 'mkv', 'wmv'].includes(ext);
    const isGif = ext === 'gif';

    useEffect(() => {
      if (thumbnail) {
        setImageLoading(true);
      }
    }, [thumbnail]);

    return (
      <div
        className={style.favouriteItem}
        onClick={() => onFavoriteClick(file)}
      >
        <div className={style.favouriteMediaContainer}>
          {imageLoading && thumbnail && (
            <div className={style.thumbnailLoading}>
              <SoftLoading />
            </div>
          )}
          {thumbnail ? (
            isVideo ? (
              <video
                src={thumbnail}
                className={style.favouriteThumbnail}
                muted
                playsInline
                preload="metadata"
                onLoadedData={(e) => {
                  e.target.currentTime = 0;
                  setImageLoading(false);
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                  setImageLoading(false);
                }}
              />
            ) : isGif ? (
              <img
                src={thumbnail}
                alt={file.name}
                className={`${style.favouriteThumbnail} ${style.animatedThumbnail}`}
                onLoad={() => setImageLoading(false)}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                  setImageLoading(false);
                }}
              />
            ) : (
              <img
                src={thumbnail}
                alt={file.name}
                className={style.favouriteThumbnail}
                onLoad={() => setImageLoading(false)}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                  setImageLoading(false);
                }}
              />
            )
          ) : null}
          <div
            className={style.favouriteIcon}
            style={{ display: thumbnail ? 'none' : 'flex' }}
          >
            {getFileIcon(file.name)}
          </div>
          <div className={style.favouriteInfo}>
            <span className={style.favouriteName}>{file.name}</span>
            <span className={style.favouriteFolderName}>
              {file.path.split('/').slice(0, -1).join('/') || 'Root'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
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
        return '📦';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'webm':
      case 'mkv':
        return '🎬';
      case 'mp3':
      case 'wav':
      case 'flac':
        return '🎵';
      default:
        return '📎';
    }
  };

  const getFileThumbnail = (file) => {
    if (!file || !file.name) return null;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
    const isVideo = ['mp4', 'avi', 'mov', 'webm', 'mkv', 'wmv'].includes(ext);

    if (isImage || isVideo) {
      // Use thumbnail API endpoint instead of full file download
      const thumbnailUrl = `/api/files/thumbnail?path=${encodeURIComponent(file.path)}`;
      return thumbnailUrl;
    }

    return null;
  };

  const getBreadcrumbs = () => {
    if (currentPath === 'favorites') return [{ name: 'Favourites', path: 'favorites' }];
    if (currentPath === '' || currentPath === undefined) return [{ name: 'Main Storage', path: '' }];

    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Main Storage', path: '' }];

    let currentBreadcrumbPath = '';
    for (const part of parts) {
      currentBreadcrumbPath += (currentBreadcrumbPath ? '/' : '') + part;
      breadcrumbs.push({ name: part, path: currentBreadcrumbPath });
    }

    if (breadcrumbs.length > 5) {
      return breadcrumbs.slice(-5);
    }

    return breadcrumbs;
  };

  const navigateToBreadcrumb = (breadcrumbPath) => {
    setCurrentPath(breadcrumbPath);
  };

  const navigateToFolder = (folderPath) => {
    if (folderPath === currentPath) return;
    setCurrentPath(folderPath);
  };

  const handleFolderSelect = (folderPath) => {
    navigateToFolder(folderPath);
  };

  const handleFolderDoubleClick = (folderPath) => {
    navigateToFolder(folderPath);
  };
  const handleNewFolder = async () => {
    setShowNewFolderPopup(true);
  };

  const createNewFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const result = await api.post('/api/files', JSON.stringify({
        action: 'create_folder',
        path: currentPath === 'favorites' ? '' : currentPath, // Create in root if on favorites page
        name: newFolderName
      }));

      if (result.success) {
        setShowNewFolderPopup(false);
        setNewFolderName('');
        // Refresh the file list
        if (fileListRef.current) {
          fileListRef.current.refresh();
        }
        return;
      } else {
        alert(`Folder creation failed: ${result.message}`);
      }

    } catch (error) {
      console.error('Folder creation error:', error);
      alert('Folder creation failed: Network error');
    }
  };

  const cancelNewFolder = () => {
    setShowNewFolderPopup(false);
    setNewFolderName('');
  };

  const handleSelectAll = () => {
    if (fileListRef.current) {
      fileListRef.current.selectAll();
    }
  };

  const toggleViewMode = () => {
    setViewMode(prevMode => prevMode === 'list' ? 'grid' : 'list');
  };

  const handleSortByOption = (sortOption) => {
    setSortBy(sortOption);
    setShowSortOptionsMenu(false);
    setSortMenuSwipePosition(0);
    if (fileListRef.current) {
      fileListRef.current.refresh();
    }
  };

  const handleSortMenuTouchStart = (e) => {
    const touch = e.touches[0];
    setSortMenuInitialY(touch.clientY);
    setIsSwipingSort(true);
    setSortMenuSwipePosition(0);
  };

  const handleSortMenuTouchMove = (e) => {
    if (!isSwipingSort) return;
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - sortMenuInitialY;

    // Only allow downward swipes (positive deltaY)
    if (deltaY > 0) {
      const containerHeight = window.innerHeight;
      const maxSwipe = containerHeight * 0.3; // Max 30% of screen height
      const normalizedPosition = Math.min(deltaY / maxSwipe, 1) * 100;
      setSortMenuSwipePosition(normalizedPosition);
    } else {
      setSortMenuSwipePosition(0);
    }
  };

  const handleSortMenuTouchEnd = (e) => {
    setIsSwipingSort(false);

    // If swiped down more than 25%, close the menu
    if (sortMenuSwipePosition > 25) {
      setShowSortOptionsMenu(false);
      setSortMenuSwipePosition(0);
      setSortMenuInitialY(0);
    } else {
      // Snap back to original position
      setSortMenuSwipePosition(0);
    }
  }; const handleNewFile = async () => {
    const fileName = prompt('Enter file name:', 'New File.txt');

    if (!fileName) return;

    try {
      const result = await api.post('/api/files', JSON.stringify({
        action: 'create_file',
        path: currentPath,
        name: fileName,
        content: ''
      }));

      if (result.success) return
      else alert(`File creation failed: ${result.message}`);

    } catch (error) {
      console.error('File creation error:', error);
      alert('File creation failed: Network error');
    }
  };

  const handleNewTextFile = async () => {
    const fileName = prompt('Enter text file name:', 'New Document.txt');

    if (!fileName) return;
    const finalName = fileName.endsWith('.txt') ? fileName : fileName + '.txt';

    try {
      const result = await api.post('/api/files', JSON.stringify({
        action: 'create_file',
        path: currentPath,
        name: finalName,
        content: ''
      }));

      if (result.success) return
      else alert(`Text file creation failed: ${result.message}`);

    } catch (error) {
      alert('Text file creation failed: Network error');
    }
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) uploadFiles(files);
    };
    input.click();
  };

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;

    // Validate files before upload
    const maxFileSize = 500 * 1024 * 1024; // 500MB per file
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      toast.addError(`Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Max size: 500MB`);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('path', currentPath);

      // Add file size validation and progress tracking
      let totalSize = 0;
      for (const file of files) {
        formData.append('files', file);
        totalSize += file.size;
      }

      // Append metadata to preserve file properties
      appendMetadataToFormData(formData, files);

      // Show immediate feedback
      const sizeText = totalSize > 1024 * 1024
        ? `${(totalSize / (1024 * 1024)).toFixed(1)}MB`
        : `${(totalSize / 1024).toFixed(1)}KB`;

      toast.addInfo(`Uploading ${files.length} file${files.length > 1 ? 's' : ''} (${sizeText})...`);

      // Use enhanced api.upload for FormData handling
      const result = await api.upload('/api/files/upload', formData);

      if (result.success) {
        // Show detailed success message
        const uploadedNames = result.files?.map(f => f.name).join(', ') || 'files';
        toast.addSuccess(`✅ Uploaded: ${uploadedNames}`);

        // Refresh file list
        if (fileListRef.current) {
          fileListRef.current.refresh();
        }
      } else {
        // Show specific error based on error code
        let errorMsg = 'Upload failed';
        switch (result.code) {
          case 'no_files':
            errorMsg = 'No files selected for upload';
            break;
          case 'folder_auth_failed':
            errorMsg = 'Permission denied for current folder';
            break;
          case 'explorer_invalid_path':
            errorMsg = 'Invalid file path detected';
            break;
          default:
            errorMsg = result.message || 'Unknown upload error';
        }
        toast.addError(errorMsg);
      }

    } catch (error) {
      console.error('Upload error:', error);

      if (error.name === 'AbortError') {
        toast.addWarning('Upload cancelled');
      } else if (error.message?.includes('fetch')) {
        toast.addError('Network error: Check your connection and try again');
      } else {
        toast.addError(`Upload failed: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Global drag & drop handlers
  const handleGlobalDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if drag contains files
    const hasFiles = e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');

    if (!hasFiles) return;

    if (currentPath === 'favorites') {
      setIsDragInvalid(true);
      setIsGlobalDragOver(false);
    } else {
      setIsDragInvalid(false);
      setIsGlobalDragOver(true);
    }
  };

  const handleGlobalDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
  };

  const handleGlobalDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;

    // Only clear states when truly leaving the page
    if (dragCounterRef.current === 0) {
      setIsGlobalDragOver(false);
      setIsDragInvalid(false);
    }
  };

  const handleGlobalDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset drag states
    setIsGlobalDragOver(false);
    setIsDragInvalid(false);
    dragCounterRef.current = 0;

    if (currentPath === 'favorites') {
      toast?.addError('Cannot upload files to favorites');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const handleDownload = () => {
    console.log(selectedItems)
    if (!selectedItems || selectedItems.length === 0) return;

    selectedItems.forEach(item => {
      console.log(item)
      if (item.type === 'file') downloadFile(item.path, item.name);
      else if (item.type === 'folder') downloadFolder(item.path, item.name);
      else return
    });
    toast.addInfo(`Started download of ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}`);
  };

  const handleDelete = async () => {
    if (!selectedItems || selectedItems.length === 0) return;
    const itemNames = selectedItems.map(item => item.name).join(', ');
    setConfirmState({
      open: true,
      title: `Delete ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}`,
      message: `Are you sure you want to delete: ${itemNames}? This cannot be undone.`,
      action: 'bulk-delete'
    });
  };

  const handleRename = () => {
    // Delegate to FileList's inline rename logic by emitting a custom event that FileList can listen for via ref
    if (!selectedItems || selectedItems.length !== 1) return;
    if (fileListRef.current) {
      // Implemented in FileList: expose a startRename method through useImperativeHandle
      fileListRef.current.startRename?.(selectedItems[0]);
    }
  };

  const executeConfirmed = async () => {
    if (confirmState.action === 'bulk-delete') {
      try {
        const paths = selectedItems.map(item => item.path);
        const result = await api.post('/api/files/delete', { paths });
        if (result.success) {
          toast.addSuccess(`Deleted ${paths.length} item${paths.length > 1 ? 's' : ''}`);
          setSelectedItems([]);
          fileListRef.current?.refresh?.();
        } else {
          toast.addError(`Delete failed: ${result.message}`);
        }
      } catch (e) {
        toast.addError('Delete failed: network error');
      } finally {
        setConfirmState({ open: false, title: '', message: '', action: '' });
      }
    } else {
      setConfirmState({ open: false, title: '', message: '', action: '' });
    }
  };

  const handleFavorite = () => {
    if (!selectedItems || selectedItems.length === 0) return;
    if (fileListRef.current) {
      fileListRef.current.triggerFavorite(selectedItems);
      toast.addInfo(selectedItems.length === 1 ? 'Toggled favorite' : 'Favorites updated');
    }
  };

  const handleProperties = () => {
    if (!selectedItems || selectedItems.length === 0) return;
    setPropertiesState({ open: true, items: selectedItems.map(i => ({ ...i })) });
  };

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  const handleViewChange = (newViewMode) => {
    setViewMode(newViewMode);
  };

  const handleSelectionChange = useCallback((items) => {
    setSelectedItems(items);
  }, []);

  const handleFilesUpload = (files) => {
    uploadFiles(files);
  };

  // New item modal state & logic
  const [newItemModalOpen, setNewItemModalOpen] = useState(false);
  const [newItemInitialType, setNewItemInitialType] = useState('folder');

  const openNewItemModal = (initialType = 'folder') => {
    setNewItemInitialType(initialType);
    setNewItemModalOpen(true);
  };

  const existingNames = (fileListRef.current?.getItems?.() || []).map(i => i.name);

  const handleCreateItem = async ({ type, name }) => {
    try {
      const data = await api.post('/api/files/create', { name, type, currentPath });
      if (!data.success) {
        toast.addError(`Failed to create ${type}: ${data.message || data.code}`);
        return { success: false, error: data.message || data.code };
      }
      fileListRef.current?.refresh?.();
      toast.addSuccess(`${type === 'folder' ? 'Folder' : type === 'text' ? 'Text document' : 'File'} "${name}" created`);
      return { success: true };
    } catch (e) {
      toast.addError(`Create failed: ${e.message}`);
      return { success: false, error: e.message };
    }
  };

  // Lightweight handler passed to FileViewer to avoid full list refresh on save
  const handleFileViewerAction = (action, payload) => {
    if (action === 'content-updated') {
      const { file, content, saved } = payload || {};
      if (file && typeof content === 'string') {
        const optimisticSize = new Blob([content]).size;
        fileListRef.current?.updateItem?.(file.path, { size: optimisticSize, modified: new Date() });
        if (saved) toast.addSuccess(`Saved changes to ${file.name}`);
      }
      return;
    }
  };

  if (!user) return null;

  return (
    <div
      onDragOver={handleGlobalDragOver}
      onDragEnter={handleGlobalDragEnter}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
      style={{ position: 'relative', height: '100%', width: '100%' }}
    >
      {/* Global drag overlay */}
      {isGlobalDragOver && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          fontWeight: '600',
          color: 'white',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          Drop files here to upload
        </div>
      )}
      {isDragInvalid && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(220, 53, 69, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          fontWeight: '600',
          color: 'white',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          Cannot upload to favorites
        </div>
      )}

      <Layout styleStyle={style.main} loading={loading} user={user} sideNav={true} currentPath={currentPath}>
        <ConfirmModal
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          destructive={confirmState.action === 'bulk-delete'}
          confirmLabel={confirmState.action === 'bulk-delete' ? 'Delete' : 'Confirm'}
          cancelLabel="Cancel"
          onCancel={() => setConfirmState({ open: false, title: '', message: '', action: '' })}
          onConfirm={executeConfirmed}
        />
        <FilePropertiesModal
          open={propertiesState.open}
          items={propertiesState.items}
          onClose={() => setPropertiesState({ open: false, items: [] })}
        />
        {/* Pass action handler down via FileList -> FileViewer chain if supported */}
        {!isMobile && (
          <div className={style.desktopContainer}>
            <Controls
              currentPath={currentPath}
              selectedItems={selectedItems}
              onOpenNewItemModal={openNewItemModal}
              onUpload={handleUpload}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onRename={handleRename}
              onFavorite={handleFavorite}
              onProperties={handleProperties}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              viewMode={viewMode}
              onViewChange={handleViewChange}
            />
            <div className={style.diskContainerRow}>
              <Resizable
                defaultSize={{ width: 300, height: "100%" }}
                minWidth={200}
                maxWidth={500}
                minHeight="100%"
                maxHeight="100%"
                enable={{
                  top: false,
                  right: true,
                  bottom: false,
                  left: false,
                  topRight: false,
                  bottomRight: false,
                  bottomLeft: false,
                  topLeft: false
                }}
              >
                <div className={style.folderStructureSidebar}>
                  <Image
                    src="/assets/app/corner.svg"
                    alt="corner"
                    width={30}
                    height={30}
                    loading="eager"
                    className={style.corner}
                  />
                  <FolderTree
                    socket={socket}
                    onFolderSelect={handleFolderSelect}
                    selectedPath={currentPath}
                    mobile={isMobile}
                  />
                </div>
              </Resizable>
              <div className={style.fileListContainer}>
                <FileList
                  ref={fileListRef}
                  socket={socket}
                  currentPath={currentPath}
                  onFolderDoubleClick={handleFolderDoubleClick}
                  onSelectionChange={handleSelectionChange}
                  onFilesUpload={handleFilesUpload}
                  sortBy={sortBy}
                  viewMode={viewMode}
                  user={user}
                  mobile={isMobile}
                />
              </div>
            </div>
          </div>
        )}
        {/* New Item Modal */}
        <NewItemModal
          isOpen={newItemModalOpen}
          existingNames={existingNames}
          onClose={() => setNewItemModalOpen(false)}
          onCreate={handleCreateItem}
          initialType={newItemInitialType}
        />
        {isMobile && (
          <div className={style.mobileContainer}>
            <div className={style.favouritesContainer}>
              <div className={style.favouritesHeader}>
                <h2 className={style.favouritesTitle}>Favourites</h2>
                {(favorites.files.length > 0 || favorites.folders.length > 0) && (
                  <button
                    className={style.viewAllButton}
                    onClick={() => setCurrentPath('favorites')}
                  >
                    View All
                  </button>
                )}
              </div>
              {(favorites.files.length > 0 || favorites.folders.length > 0) ? (
                <div className={style.favouritesList}>
                  {favorites.folders.map((folder) => (
                    <div
                      key={`folder-${folder.id}`}
                      className={style.favouriteItem}
                      onClick={() => handleFavoriteClick(folder)}
                    >
                      <div className={style.favouriteMediaContainer}>
                        <div className={style.favouriteIcon}>
                          📁
                        </div>
                        <div className={style.favouriteInfo}>
                          <span className={style.favouriteName}>{folder.name}</span>
                          <span className={style.favouriteFolderName}>
                            {folder.path.split('/').slice(0, -1).join('/') || 'Root'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {favorites.files.map((file) => (
                    <FavoriteFileItem
                      key={`file-${file.id}`}
                      file={file}
                      onFavoriteClick={handleFavoriteClick}
                    />
                  ))}
                </div>
              ) : (
                <div className={style.favouritesEmpty}>
                  <span>No favourites yet</span>
                  <small>Star files and folders to see them here</small>
                </div>
              )}
            </div>

            <div className={style.storageContainer}>
              <h2 className={style.storageTitle}>All storage</h2>
              <div className={style.storageList}>
                <div
                  className={style.storageItem}
                  onClick={() => setCurrentPath('')}
                >
                  <div className={style.storageIcon}>
                    💾
                  </div>
                  <div className={style.storageInfo}>
                    <span className={style.storageName}>Main Storage</span>
                    <span className={style.storageSize}>
                      {storageLoading ? (
                        ''
                      ) : (
                        `${formatFileSize(storageInfo.totalSize)} • ${storageInfo.totalFiles} files`
                      )}
                    </span>
                  </div>
                </div>

                {(favorites.files.length > 0 || favorites.folders.length > 0) && (
                  <div
                    className={style.storageItem}
                    onClick={() => setCurrentPath('favorites')}
                  >
                    <div className={style.storageIcon}>
                      ⭐
                    </div>
                    <div className={style.storageInfo}>
                      <span className={style.storageName}>Favourites</span>
                      <span className={style.storageSize}>
                        {favorites.files.length + favorites.folders.length} items
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile file explorer overlay */}
            {currentPath !== undefined && (
              <div className={`${style.mobileExplorerContainer} ${style.active}`}>
                <div className={style.mobileExplorerHeader}>
                  <div className={style.headerContent}>
                    <div className={style.folderNameBack}>
                      <button className={style.backButton} onClick={() => setCurrentPath(undefined)}><ArrowLeft size={20} /></button>
                      <h3 className={style.explorerTitle}>
                        {currentPath === '' ? 'Main Storage' : currentPath === 'favorites' ? 'Favourites' : currentPath.split('/').pop() || 'Files'}
                      </h3>
                    </div>
                    <div className={style.explorerControls}>
                      <button className={style.viewToggleButton} onClick={toggleViewMode}>
                        {viewMode === 'list' ? <LayoutGrid /> : <List />}
                      </button>
                      <button
                        className={style.menuButton}
                        onClick={() => setShowSortMenu(true)}
                      >
                        <EllipsisVertical size={18} />
                      </button>
                    </div>
                  </div>
                  <div className={style.breadcrumbs}>
                    {getBreadcrumbs().map((breadcrumb, index) => {
                      const isLast = index === getBreadcrumbs().length - 1;
                      return (
                        <span key={breadcrumb.path} className={style.breadcrumbItem}>
                          {index > 0 && <span className={style.breadcrumbSeparator}>›</span>}
                          {isLast ? (
                            <span className={style.breadcrumbCurrent}>{breadcrumb.name}</span>
                          ) : (
                            <button
                              className={style.breadcrumbLink}
                              onClick={() => navigateToBreadcrumb(breadcrumb.path)}
                            >
                              {breadcrumb.name}
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className={style.mobileFileListContainer}>
                  <FileList
                    ref={fileListRef}
                    socket={socket}
                    currentPath={currentPath}
                    onFolderDoubleClick={handleFolderDoubleClick}
                    onSelectionChange={handleSelectionChange}
                    onFilesUpload={handleFilesUpload}
                    sortBy={sortBy}
                    viewMode={viewMode}
                    user={user}
                    mobile={isMobile}
                  />
                </div>

                <button className={style.floatingAddButton} onClick={handleNewFolder}>
                  <Plus size={35} />
                </button>
              </div>
            )}

            {/* Sort Menu */}
            {showSortMenu && (
              <div className={style.sortMenuOverlay} onClick={() => setShowSortMenu(false)}>
                <div className={style.sortMenu} onClick={(e) => e.stopPropagation()}>
                  <div className={style.sortMenuHeader}>
                    <h3>Options</h3>
                    <button onClick={() => setShowSortMenu(false)}>×</button>
                  </div>
                  <div className={style.sortMenuOptions}>
                    <button onClick={() => {
                      setShowSortMenu(false);
                      handleSelectAll();
                    }}>Select All</button>
                    <button onClick={() => {
                      setShowSortMenu(false);
                      setShowSortOptionsMenu(true);
                    }}>Sort By</button>
                    <button onClick={() => {
                      setShowSortMenu(false);
                      handleNewFolder();
                    }}>Add New Folder</button>
                  </div>
                </div>
              </div>
            )}

            {/* Sort Options Menu */}
            {showSortOptionsMenu && (
              <div className={style.popupModalMenuOverlay} onClick={() => {
                setShowSortOptionsMenu(false);
                setSortMenuSwipePosition(0);
                setSortMenuInitialY(0);
              }}>
                <div
                  className={style.popupModalMenu}
                  style={{
                    transform: `translateY(${sortMenuSwipePosition}%)`
                  }}
                  onTouchStart={handleSortMenuTouchStart}
                  onTouchMove={handleSortMenuTouchMove}
                  onTouchEnd={handleSortMenuTouchEnd}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={style.popupModalMenuHeader}>
                    <div className={style.dragHandle}></div>
                    <div>
                      <h3>Sort By</h3>
                      <button onClick={() => {
                        setShowSortOptionsMenu(false);
                        setSortMenuSwipePosition(0);
                        setSortMenuInitialY(0);
                      }}><X /></button>
                    </div>
                  </div>
                  <div className={style.popupModalMenuOptions}>
                    <button
                      className={sortBy === 'name' ? style.active : ''}
                      onClick={() => handleSortByOption('name')}
                    >
                      Name
                      {sortBy === 'name' && <span><Check size={20} strokeWidth={2.5} /></span>}
                    </button>
                    <button
                      className={sortBy === 'size' ? style.active : ''}
                      onClick={() => handleSortByOption('size')}
                    >
                      File Size
                      {sortBy === 'size' && <span><Check size={20} strokeWidth={2.5} /></span>}
                    </button>
                    <button
                      className={sortBy === 'modified' ? style.active : ''}
                      onClick={() => handleSortByOption('modified')}
                    >
                      Modified Date
                      {sortBy === 'modified' && <span><Check size={20} strokeWidth={2.5} /></span>}
                    </button>
                    <button
                      className={sortBy === 'type' ? style.active : ''}
                      onClick={() => handleSortByOption('type')}
                    >
                      File Type
                      {sortBy === 'type' && <span><Check size={20} strokeWidth={2.5} /></span>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* New Folder Popup */}
            {showNewFolderPopup && (
              <div className={style.popupOverlay} onClick={cancelNewFolder}>
                <div className={style.popup} onClick={(e) => e.stopPropagation()}>
                  <h3>New folder</h3>
                  <input
                    type="text"
                    placeholder="Enter new folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createNewFolder()}
                    autoFocus
                  />
                  <div className={style.popupButtons}>
                    <button className={style.cancelButton} onClick={cancelNewFolder}>
                      Cancel
                    </button>
                    <button className={style.createButton} onClick={createNewFolder}>
                      Create folder
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Layout>
    </div>
  );
}
