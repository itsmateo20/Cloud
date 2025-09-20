// utils/downloadUtils.js

import JSZip from 'jszip';
import { api } from '@/utils/api';

export class DownloadManager {
    static instance = null;
    activeDownloads = new Map();
    chunkSize = 25 * 1024 * 1024; // 25MB chunks
    maxConcurrentChunks = 4; // Number of simultaneous chunk downloads

    constructor() {
        if (DownloadManager.instance) {
            return DownloadManager.instance;
        }
        DownloadManager.instance = this;
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    // Basic file download with progress tracking
    async downloadFile(filePath, fileName, type = 'file') {
        const downloadId = this.generateId();
        let progressTimeout;
        let hasReceivedProgress = false;
        let isCompleted = false;

        try {
            window.dispatchEvent(new CustomEvent('downloadStart', {
                detail: {
                    id: downloadId,
                    fileName,
                    fileSize: 0,
                    type
                }
            }));

            const abortController = new AbortController();
            this.activeDownloads.set(downloadId, abortController);
            const handleCancel = (event) => {
                if (event.detail.id === downloadId) {
                    abortController.abort();
                }
            };
            window.addEventListener('downloadCancel', handleCancel);

            const url = type === 'folder'
                ? `/api/files/folder-zip?path=${encodeURIComponent(filePath)}`
                : `/api/files/download?path=${encodeURIComponent(filePath)}`;

            const startProgressTimeout = () => {
                clearTimeout(progressTimeout);
                progressTimeout = setTimeout(() => {
                    if (!hasReceivedProgress && !isCompleted) {
                        window.dispatchEvent(new CustomEvent('downloadProgress', {
                            detail: { id: downloadId, loaded: 0, total: 0, speed: 0, indeterminate: true }
                        }));
                    }
                }, 10000);
            };

            // For folders (ZIP downloads), handle differently for better progress tracking
            if (type === 'folder') {
                startProgressTimeout();
                const response = await api.raw('GET', url, null, { signal: abortController.signal });

                if (!response.ok) {
                    clearTimeout(progressTimeout);
                    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
                }

                // Get total size info from headers
                const totalFiles = parseInt(response.headers.get('X-Total-Files') || '0');
                const totalSize = parseInt(response.headers.get('X-Total-Size') || '0');

                window.dispatchEvent(new CustomEvent('downloadProgress', {
                    detail: {
                        id: downloadId,
                        loaded: 0,
                        total: totalSize,
                        speed: 0,
                        totalFiles,
                        type: 'folder-zip'
                    }
                }));

                // Stream the response
                const reader = response.body.getReader();
                const chunks = [];
                let downloaded = 0;
                let lastTime = Date.now();
                let lastLoaded = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    chunks.push(value);
                    downloaded += value.length;

                    const now = Date.now();
                    const timeDiff = (now - lastTime) / 1000;

                    if (timeDiff >= 0.5) {
                        const bytesDiff = downloaded - lastLoaded;
                        const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

                        window.dispatchEvent(new CustomEvent('downloadProgress', {
                            detail: {
                                id: downloadId,
                                loaded: downloaded,
                                total: totalSize || downloaded,
                                speed,
                                totalFiles,
                                type: 'folder-zip'
                            }
                        }));

                        lastTime = now;
                        lastLoaded = downloaded;
                    }

                    if (abortController.signal.aborted) {
                        reader.cancel();
                        throw new Error('Download cancelled');
                    }
                }

                // Create blob and download
                const blob = new Blob(chunks);
                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(downloadUrl);

            } else {
                // Regular file download
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                startProgressTimeout();
                const progressResponse = await api.raw('GET', url, null, { signal: abortController.signal });

                if (!progressResponse.ok) {
                    clearTimeout(progressTimeout);
                    throw new Error(`Download failed: ${progressResponse.status} ${progressResponse.statusText}`);
                }

                const contentLength = progressResponse.headers.get('content-length');
                const total = contentLength ? parseInt(contentLength, 10) : 0;
                window.dispatchEvent(new CustomEvent('downloadProgress', {
                    detail: {
                        id: downloadId,
                        loaded: 0,
                        total,
                        speed: 0,
                        type: 'file'
                    }
                }));

                // Simulate progress completion for direct downloads
                setTimeout(() => {
                    if (!isCompleted) {
                        window.dispatchEvent(new CustomEvent('downloadProgress', {
                            detail: {
                                id: downloadId,
                                loaded: total,
                                total,
                                speed: 0,
                                type: 'file'
                            }
                        }));
                    }
                }, 1000);
            }

            clearTimeout(progressTimeout);
            isCompleted = true;
            window.dispatchEvent(new CustomEvent('downloadComplete', {
                detail: { id: downloadId, fileName, type }
            }));

            window.removeEventListener('downloadCancel', handleCancel);
            this.activeDownloads.delete(downloadId);

        } catch (error) {
            clearTimeout(progressTimeout);
            this.activeDownloads.delete(downloadId);

            if (error.name === 'AbortError' || error.message === 'Download cancelled') {
                window.dispatchEvent(new CustomEvent('downloadCancelled', {
                    detail: { id: downloadId, fileName }
                }));
            } else {
                window.dispatchEvent(new CustomEvent('downloadError', {
                    detail: { id: downloadId, fileName, error: error.message }
                }));
            }
            throw error;
        }
    }

    // Chunked download for large files with progress tracking
    async downloadFileChunked(filePath, fileName, preserveDate = true) {
        const downloadId = this.generateId();
        let isCompleted = false;

        try {
            window.dispatchEvent(new CustomEvent('downloadStart', {
                detail: {
                    id: downloadId,
                    fileName,
                    fileSize: 0,
                    type: 'file'
                }
            }));

            const abortController = new AbortController();
            this.activeDownloads.set(downloadId, abortController);

            // Get file metadata first
            const metadata = await api.get(`/api/files/metadata?path=${encodeURIComponent(filePath)}`, {
                signal: abortController.signal
            });

            if (!metadata.success) {
                throw new Error(`Failed to get file metadata: ${metadata.message || 'Unknown error'}`);
            }

            const fileSize = metadata.data?.size || 0;
            const lastModified = preserveDate ? new Date(metadata.data?.lastModified) : new Date();

            window.dispatchEvent(new CustomEvent('downloadProgress', {
                detail: {
                    id: downloadId,
                    loaded: 0,
                    total: fileSize,
                    speed: 0,
                    type: 'chunked'
                }
            }));

            const url = `/api/files/download?path=${encodeURIComponent(filePath)}`;

            // If file is small, use regular download
            if (fileSize < this.chunkSize) {
                const response = await api.raw('GET', url, null, { signal: abortController.signal });
                if (!response.ok) throw new Error(`Download failed: ${response.status}`);

                const blob = await response.blob();
                this.downloadBlob(blob, fileName, lastModified);
            } else {
                // Use chunked download for large files
                const chunks = [];
                const totalChunks = Math.ceil(fileSize / this.chunkSize);
                let downloadedBytes = 0;
                let lastTime = Date.now();

                for (let i = 0; i < totalChunks; i++) {
                    if (abortController.signal.aborted) {
                        throw new Error('Download cancelled');
                    }

                    const start = i * this.chunkSize;
                    const end = Math.min(start + this.chunkSize - 1, fileSize - 1);

                    const chunkData = await this.downloadChunk(url, start, end, abortController.signal);
                    chunks.push(new Uint8Array(chunkData));
                    downloadedBytes += chunkData.byteLength;

                    const now = Date.now();
                    const timeDiff = (now - lastTime) / 1000;
                    const speed = timeDiff > 0 ? (chunkData.byteLength / timeDiff) : 0;

                    window.dispatchEvent(new CustomEvent('downloadProgress', {
                        detail: {
                            id: downloadId,
                            loaded: downloadedBytes,
                            total: fileSize,
                            speed,
                            chunk: i + 1,
                            totalChunks,
                            type: 'chunked'
                        }
                    }));

                    lastTime = now;
                }

                // Combine chunks and download
                const combinedArray = new Uint8Array(fileSize);
                let offset = 0;
                for (const chunk of chunks) {
                    combinedArray.set(chunk, offset);
                    offset += chunk.length;
                }

                const blob = new Blob([combinedArray]);
                this.downloadBlob(blob, fileName, lastModified);
            }

            isCompleted = true;
            window.dispatchEvent(new CustomEvent('downloadComplete', {
                detail: { id: downloadId, fileName, type: 'file' }
            }));

            this.activeDownloads.delete(downloadId);

        } catch (error) {
            this.activeDownloads.delete(downloadId);

            if (error.name === 'AbortError' || error.message === 'Download cancelled') {
                window.dispatchEvent(new CustomEvent('downloadCancelled', {
                    detail: { id: downloadId, fileName }
                }));
            } else {
                window.dispatchEvent(new CustomEvent('downloadError', {
                    detail: { id: downloadId, fileName, error: error.message }
                }));
            }
            throw error;
        }
    }

    // Download a single chunk
    async downloadChunk(url, start, end, signal) {
        const response = await api.raw('GET', url, null, {
            'Range': `bytes=${start}-${end}`,
            signal
        });

        if (!response.ok) {
            throw new Error(`Chunk download failed: ${response.status}`);
        }

        return response.arrayBuffer();
    }

    // Download blob with proper filename and date
    downloadBlob(blob, fileName, lastModified = null) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        // Set file date if supported
        if (lastModified && 'download' in link) {
            try {
                // This might not work in all browsers, but won't break anything
                link.setAttribute('data-last-modified', lastModified.toISOString());
            } catch (e) {
                // Ignore if not supported
            }
        }
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Download multiple files as ZIP
    async downloadMultipleFilesAsZip(files, zipName = 'files.zip', preserveDates = true) {
        const downloadId = this.generateId();
        let isCompleted = false;

        try {
            window.dispatchEvent(new CustomEvent('downloadStart', {
                detail: {
                    id: downloadId,
                    fileName: zipName,
                    fileSize: 0,
                    type: 'zip'
                }
            }));

            const abortController = new AbortController();
            this.activeDownloads.set(downloadId, abortController);

            // Use server-side ZIP creation for better performance
            const response = await api.raw('POST', '/api/files/zip', {
                files: files.map(f => f.path),
                zipName: zipName.replace(/\.zip$/i, '')
            }, { signal: abortController.signal });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to create ZIP file');
            }

            // Get content length for progress tracking
            const contentLength = parseInt(response.headers.get('content-length') || '0');

            // Stream the ZIP file
            const reader = response.body.getReader();
            const chunks = [];
            let downloadedBytes = 0;
            let lastTime = Date.now();
            let lastLoaded = 0;

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                downloadedBytes += value.length;

                // Update progress
                const now = Date.now();
                const timeDiff = (now - lastTime) / 1000;

                if (timeDiff >= 0.5) {
                    const bytesDiff = downloadedBytes - lastLoaded;
                    const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

                    window.dispatchEvent(new CustomEvent('downloadProgress', {
                        detail: {
                            id: downloadId,
                            loaded: downloadedBytes,
                            total: contentLength || downloadedBytes,
                            speed
                        }
                    }));

                    lastTime = now;
                    lastLoaded = downloadedBytes;
                }

                if (abortController.signal.aborted) {
                    reader.cancel();
                    throw new Error('Download cancelled');
                }
            }

            // Create blob and download
            const zipBlob = new Blob(chunks, { type: 'application/zip' });

            // Download ZIP
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            isCompleted = true;
            window.dispatchEvent(new CustomEvent('downloadComplete', {
                detail: { id: downloadId, fileName: zipName, type: 'zip' }
            }));

            this.activeDownloads.delete(downloadId);

        } catch (error) {
            this.activeDownloads.delete(downloadId);

            if (error.name === 'AbortError' || error.message === 'Download cancelled') {
                window.dispatchEvent(new CustomEvent('downloadCancelled', {
                    detail: { id: downloadId, fileName: zipName }
                }));
            } else {
                window.dispatchEvent(new CustomEvent('downloadError', {
                    detail: { id: downloadId, fileName: zipName, error: error.message }
                }));
            }
            throw error;
        }
    }

    // Download folder as ZIP
    async downloadFolder(folderPath, folderName) {
        const downloadId = this.generateId();
        let isCompleted = false;

        try {
            const zipName = folderName.endsWith('.zip') ? folderName : `${folderName}.zip`;

            window.dispatchEvent(new CustomEvent('downloadStart', {
                detail: {
                    id: downloadId,
                    fileName: zipName,
                    fileSize: 0,
                    type: 'folder'
                }
            }));

            const abortController = new AbortController();
            this.activeDownloads.set(downloadId, abortController);

            // Use server-side folder ZIP creation
            const response = await api.raw('POST', '/api/files/folder-zip', {
                folderPath: folderPath,
                zipName: folderName
            }, { signal: abortController.signal });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to create folder ZIP');
            }

            // Get size info from headers for better progress tracking
            const contentLength = parseInt(response.headers.get('content-length') || '0');
            const totalFiles = parseInt(response.headers.get('X-Total-Files') || '0');
            const totalSize = parseInt(response.headers.get('X-Total-Size') || '0');

            // Use totalSize if available, otherwise fallback to content-length
            const estimatedTotal = totalSize || contentLength;

            // Stream the ZIP file
            const reader = response.body.getReader();
            const chunks = [];
            let downloadedBytes = 0;
            let lastTime = Date.now();
            let lastLoaded = 0;

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                downloadedBytes += value.length;

                // Update progress
                const now = Date.now();
                const timeDiff = (now - lastTime) / 1000;

                if (timeDiff >= 0.5) {
                    const bytesDiff = downloadedBytes - lastLoaded;
                    const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

                    window.dispatchEvent(new CustomEvent('downloadProgress', {
                        detail: {
                            id: downloadId,
                            loaded: downloadedBytes,
                            total: estimatedTotal || downloadedBytes,
                            speed,
                            totalFiles,
                            type: 'folder'
                        }
                    }));

                    lastTime = now;
                    lastLoaded = downloadedBytes;
                }

                if (abortController.signal.aborted) {
                    reader.cancel();
                    throw new Error('Download cancelled');
                }
            }

            // Create and download ZIP
            const zipBlob = new Blob(chunks, { type: 'application/zip' });
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = zipName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            isCompleted = true;
            window.dispatchEvent(new CustomEvent('downloadComplete', {
                detail: { id: downloadId, fileName: zipName, type: 'folder' }
            }));

            this.activeDownloads.delete(downloadId);

        } catch (error) {
            this.activeDownloads.delete(downloadId);

            if (error.name === 'AbortError' || error.message === 'Download cancelled') {
                window.dispatchEvent(new CustomEvent('downloadCancelled', {
                    detail: { id: downloadId, fileName: folderName }
                }));
            } else {
                window.dispatchEvent(new CustomEvent('downloadError', {
                    detail: { id: downloadId, fileName: folderName, error: error.message }
                }));
            }
            throw error;
        }
    }

    // Cancel download
    cancelDownload(downloadId) {
        const abortController = this.activeDownloads.get(downloadId);
        if (abortController) {
            abortController.abort();
            this.activeDownloads.delete(downloadId);
        }
    }

    // Cancel all downloads
    cancelAllDownloads() {
        for (const [id, abortController] of this.activeDownloads) {
            abortController.abort();
        }
        this.activeDownloads.clear();
    }
}

// Singleton instance
export const downloadManager = new DownloadManager();

// Convenience functions
export const downloadFile = (filePath, fileName, chunked = false, preserveDate = true) => {
    return chunked 
        ? downloadManager.downloadFileChunked(filePath, fileName, preserveDate)
        : downloadManager.downloadFile(filePath, fileName);
};

export const downloadMultipleFiles = (files, zipName = 'files.zip', preserveDates = true) => {
    return downloadManager.downloadMultipleFilesAsZip(files, zipName, preserveDates);
};

export const downloadFolder = (folderPath, folderName) => {
    return downloadManager.downloadFolder(folderPath, folderName);
};