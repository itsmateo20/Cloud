// app/page.js
"use client";

import style from "@/public/styles/main.module.css";

import { useAuth } from "@/context/AuthProvider";
import { io } from "socket.io-client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";

import { Resizable } from "re-resizable";
import Layout from "@/components/Layout";
import FolderTree from "@/components/app/FolderTree";
import FileList from "@/components/app/FileList";
import Controls from "@/components/app/Controls";
import { downloadFile, downloadFolder } from "@/utils/downloadUtils";

let socket;

export default function Page() {
  const { user, loading } = useAuth();
  const fileListRef = useRef(null);

  const [currentPath, setCurrentPath] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState("list");

  useEffect(() => {
    if (!socket) socket = io();
    setCurrentPath('');

    return () => {
      socket?.off("folder-structure-updated");
      socket?.off("file-updated");
      socket = null;
    };
  }, []);

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
    const folderName = prompt('Enter folder name:', 'New Folder');

    if (!folderName) return;

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_folder',
          path: currentPath,
          name: folderName
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('Folder created successfully');
      } else {
        console.error('Folder creation failed:', result.message);
        alert(`Folder creation failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Folder creation error:', error);
      alert('Folder creation failed: Network error');
    }
  };

  const handleNewFile = async () => {
    const fileName = prompt('Enter file name:', 'New File.txt');

    if (!fileName) return;

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_file',
          path: currentPath,
          name: fileName,
          content: ''
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('File created successfully');
      } else {
        console.error('File creation failed:', result.message);
        alert(`File creation failed: ${result.message}`);
      }
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
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_file',
          path: currentPath,
          name: finalName,
          content: ''
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('Text file created successfully');
      } else {
        console.error('Text file creation failed:', result.message);
        alert(`Text file creation failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Text file creation error:', error);
      alert('Text file creation failed: Network error');
    }
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        uploadFiles(files);
      }
    };
    input.click();
  };

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;

    try {
      const formData = new FormData();
      formData.append('path', currentPath);

      for (const file of files) {
        formData.append('files', file);
      }

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        console.log('Upload successful:', result.message);
        if (fileListRef.current) {
          fileListRef.current.refresh();
        }
      } else {
        console.error('Upload failed:', result.message);
        alert(`Upload failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: Network error');
    }
  };

  const handleDownload = () => {
    if (!selectedItems || selectedItems.length === 0) return;

    selectedItems.forEach(item => {
      if (item.type === 'file') {
        downloadFile(item.path, item.name);
      } else if (item.type === 'folder') {
        downloadFolder(item.path, item.name);
      } else {
        console.log('Unknown item type for download:', item);
      }
    });
  };

  const handleDelete = async () => {
    if (!selectedItems || selectedItems.length === 0) return;

    const itemNames = selectedItems.map(item => item.name).join(', ');
    const confirmed = confirm(`Are you sure you want to delete: ${itemNames}?`);

    if (!confirmed) return;

    try {
      const paths = selectedItems.map(item => item.path);

      const response = await fetch('/api/files/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paths })
      });

      const result = await response.json();

      if (result.success) {
        console.log('Delete successful');
        setSelectedItems([]);
      } else {
        console.error('Delete failed:', result.message);
        alert(`Delete failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed: Network error');
    }
  };

  const handleRename = async () => {
    if (!selectedItems || selectedItems.length !== 1) return;

    const item = selectedItems[0];
    const newName = prompt(`Rename "${item.name}" to:`, item.name);

    if (!newName || newName === item.name) return;

    try {
      const response = await fetch('/api/files/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldPath: item.path,
          newName: newName
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('Rename successful');
        setSelectedItems([]);
      } else {
        console.error('Rename failed:', result.message);
        alert(`Rename failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Rename error:', error);
      alert('Rename failed: Network error');
    }
  };

  const handleFavorite = () => {
    if (!selectedItems || selectedItems.length === 0) return;
    if (fileListRef.current) {
      fileListRef.current.triggerFavorite(selectedItems);
    }
  };

  const handleProperties = () => {
    if (!selectedItems || selectedItems.length === 0) return;
    const item = selectedItems[0];

    let info = `Properties for: ${item.name}\n\n`;
    info += `Type: ${item.type}\n`;
    info += `Path: ${item.path}\n`;

    if (item.size !== undefined) {
      const size = item.size;
      const sizeStr = size < 1024 ? `${size} B` :
        size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` :
          size < 1024 * 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` :
            `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      info += `Size: ${sizeStr}\n`;
    }

    if (item.modified) {
      info += `Modified: ${new Date(item.modified).toLocaleString()}\n`;
    }

    if (item.isFavorited !== undefined) {
      info += `Favorited: ${item.isFavorited ? 'Yes' : 'No'}\n`;
    }

    if (selectedItems.length > 1) {
      info += `\n+ ${selectedItems.length - 1} more items selected`;
    }

    alert(info);
  };

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    console.log('Sort by:', newSortBy);
  };

  const handleViewChange = (newViewMode) => {
    setViewMode(newViewMode);
    console.log('View mode:', newViewMode);
  };

  const handleSelectionChange = useCallback((items) => {
    setSelectedItems(items);
  }, []);

  const handleFilesUpload = (files) => {
    uploadFiles(files);
  };

  if (!user) return null;

  return (
    <Layout styleStyle={style.main} loading={loading} user={user}>
      <Controls
        currentPath={currentPath}
        selectedItems={selectedItems}
        onNewFolder={handleNewFolder}
        onNewFile={handleNewFile}
        onNewTextFile={handleNewTextFile}
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
          />
        </div>
      </div>
    </Layout>
  );
}