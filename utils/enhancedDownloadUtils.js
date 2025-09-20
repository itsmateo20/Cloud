// utils/enhancedDownloadUtils.js

import JSZip from 'jszip';
import { api } from '@/utils/api';

export class EnhancedDownloadManager {
    static instance = null;
    activeDownloads = new Map();
    chunkSize = 25 * 1024 * 1024; // 25MB chunks
    maxConcurrentChunks = 4; // Number of simultaneous chunk downloads

    constructor() {
        if (EnhancedDownloadManager.instance) {
            return EnhancedDownloadManager.instance;
        }
        EnhancedDownloadManager.instance = this;
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

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
                    speed: 0
                }
            }));

            // Calculate chunks
            const numChunks = Math.ceil(fileSize / this.chunkSize);
            const chunks = [];
            const downloadUrl = `/api/files/download?path=${encodeURIComponent(filePath)}`;

            let loaded = 0;
            const startTime = Date.now();
            let lastTime = startTime;
            let lastLoaded = 0;

            // Download chunks concurrently
            for (let i = 0; i < numChunks; i += this.maxConcurrentChunks) {
                const chunkPromises = [];

                for (let j = 0; j < this.maxConcurrentChunks && i + j < numChunks; j++) {
                    const chunkIndex = i + j;
                    const start = chunkIndex * this.chunkSize;
                    const end = Math.min(start + this.chunkSize - 1, fileSize - 1);

                    chunkPromises.push(
                        this.downloadChunk(downloadUrl, start, end, abortController.signal)
                            .then(data => ({ index: chunkIndex, data }))
                    );
                }

                const chunkResults = await Promise.all(chunkPromises);

                chunkResults.forEach(({ index, data }) => {
                    chunks[index] = data;
                    loaded += data.byteLength;

                    // Update progress
                    const now = Date.now();
                    const timeDiff = (now - lastTime) / 1000;

                    if (timeDiff >= 0.5) {
                        const bytesDiff = loaded - lastLoaded;
                        const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

                        window.dispatchEvent(new CustomEvent('downloadProgress', {
                            detail: {
                                id: downloadId,
                                loaded,
                                total: fileSize,
                                speed
                            }
                        }));

                        lastTime = now;
                        lastLoaded = loaded;
                    }
                });
            }

            // Combine chunks
            const combinedData = new Uint8Array(fileSize);
            let offset = 0;

            for (const chunk of chunks) {
                combinedData.set(new Uint8Array(chunk), offset);
                offset += chunk.byteLength;
            }

            // Create blob and download
            const blob = new Blob([combinedData], { type: 'application/octet-stream' });

            // Set the last modified date if preserving dates
            if (preserveDate && blob.lastModified !== undefined) {
                Object.defineProperty(blob, 'lastModified', {
                    value: lastModified.getTime(),
                    writable: false
                });
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            isCompleted = true;
            window.dispatchEvent(new CustomEvent('downloadComplete', {
                detail: {
                    id: downloadId,
                    success: true
                }
            }));

            this.activeDownloads.delete(downloadId);

        } catch (error) {
            console.error('Chunked download failed:', error);

            if (!isCompleted) {
                isCompleted = true;
                window.dispatchEvent(new CustomEvent('downloadComplete', {
                    detail: {
                        id: downloadId,
                        success: false,
                        error: error.name === 'AbortError' ? 'Download cancelled' : error.message
                    }
                }));
            }

            this.activeDownloads.delete(downloadId);
        }
    }

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
                detail: {
                    id: downloadId,
                    success: true
                }
            }));

            this.activeDownloads.delete(downloadId);

        } catch (error) {
            console.error('ZIP download failed:', error);

            if (!isCompleted) {
                isCompleted = true;
                window.dispatchEvent(new CustomEvent('downloadComplete', {
                    detail: {
                        id: downloadId,
                        success: false,
                        error: error.name === 'AbortError' ? 'Download cancelled' : error.message
                    }
                }));
            }

            this.activeDownloads.delete(downloadId);
        }
    }

    cancelDownload(downloadId) {
        const abortController = this.activeDownloads.get(downloadId);
        if (abortController) {
            abortController.abort();
            this.activeDownloads.delete(downloadId);
        }
    }

    /**
     * Download an entire folder as a ZIP file
     * @param {string} folderPath - Path to the folder to download
     * @param {string} zipName - Name for the ZIP file (optional)
     * @returns {Promise<void>}
     */
    async downloadFolderAsZip(folderPath, zipName) {
        const downloadId = this.generateId();
        let isCompleted = false;

        try {
            const folderName = zipName || folderPath.split('/').pop() || 'folder';
            const sanitizedZipName = folderName.replace(/[^a-zA-Z0-9_-]/g, '_') + '.zip';

            window.dispatchEvent(new CustomEvent('downloadStart', {
                detail: {
                    id: downloadId,
                    fileName: sanitizedZipName,
                    fileSize: 0,
                    type: 'folder-zip'
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
            const blob = new Blob(chunks, { type: 'application/zip' });

            // Download ZIP
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = sanitizedZipName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            isCompleted = true;
            window.dispatchEvent(new CustomEvent('downloadComplete', {
                detail: {
                    id: downloadId,
                    success: true
                }
            }));

            this.activeDownloads.delete(downloadId);

        } catch (error) {
            console.error('Folder ZIP download failed:', error);

            if (!isCompleted) {
                isCompleted = true;
                window.dispatchEvent(new CustomEvent('downloadComplete', {
                    detail: {
                        id: downloadId,
                        success: false,
                        error: error.name === 'AbortError' ? 'Download cancelled' : error.message
                    }
                }));

                this.activeDownloads.delete(downloadId);
            }

            throw error;
        }
    }

    cancelAllDownloads() {
        for (const [id, abortController] of this.activeDownloads) {
            abortController.abort();
        }
        this.activeDownloads.clear();
    }
}

export const enhancedDownloadManager = new EnhancedDownloadManager();

export const downloadFile = (filePath, fileName, preserveDate = true) => {
    return enhancedDownloadManager.downloadFileChunked(filePath, fileName, preserveDate);
};

export const downloadMultipleFiles = (files, zipName = 'files.zip', preserveDates = true) => {
    return enhancedDownloadManager.downloadMultipleFilesAsZip(files, zipName, preserveDates);
};

export const downloadFolder = (folderPath, zipName) => {
    return enhancedDownloadManager.downloadFolderAsZip(folderPath, zipName);
};
