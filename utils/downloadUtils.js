// utils/downloadUtils.js

export class DownloadManager {
    static instance = null;
    activeDownloads = new Map();

    constructor() {
        if (DownloadManager.instance) {
            return DownloadManager.instance;
        }
        DownloadManager.instance = this;
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

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
                        isCompleted = true;
                        window.dispatchEvent(new CustomEvent('downloadComplete', {
                            detail: {
                                id: downloadId,
                                success: true
                            }
                        }));
                        this.activeDownloads.delete(downloadId);
                    }
                }, 10000);
            };

            // For folders (ZIP downloads), handle differently for better progress tracking
            if (type === 'folder') {
                startProgressTimeout();
                const response = await fetch(url, {
                    signal: abortController.signal
                });

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
                        speed: 0
                    }
                }));

                // Read the ZIP stream with progress tracking
                const reader = response.body.getReader();
                const chunks = [];
                let loaded = 0;
                let lastTime = Date.now();
                let lastLoaded = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    chunks.push(value);
                    loaded += value.length;
                    hasReceivedProgress = true;
                    const now = Date.now();
                    const timeDiff = (now - lastTime) / 1000;

                    if (timeDiff >= 0.3) { // More frequent updates for ZIP
                        const bytesDiff = loaded - lastLoaded;
                        const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

                        window.dispatchEvent(new CustomEvent('downloadProgress', {
                            detail: {
                                id: downloadId,
                                loaded,
                                total: totalSize || loaded,
                                speed
                            }
                        }));

                        lastTime = now;
                        lastLoaded = loaded;
                        startProgressTimeout();
                    }
                }

                // Create blob and trigger download
                const blob = new Blob(chunks, { type: 'application/zip' });
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);

            } else {
                // Regular file download
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                startProgressTimeout();
                const progressResponse = await fetch(url, {
                    signal: abortController.signal
                });

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
                        speed: 0
                    }
                }));

                const reader = progressResponse.body.getReader();
                let loaded = 0;
                let lastTime = Date.now();
                let lastLoaded = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    loaded += value.length;
                    hasReceivedProgress = true;
                    const now = Date.now();
                    const timeDiff = (now - lastTime) / 1000;

                    if (timeDiff >= 0.5) {
                        const bytesDiff = loaded - lastLoaded;
                        const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

                        window.dispatchEvent(new CustomEvent('downloadProgress', {
                            detail: {
                                id: downloadId,
                                loaded,
                                total,
                                speed
                            }
                        }));

                        lastTime = now;
                        lastLoaded = loaded;
                        startProgressTimeout();
                    }
                }
            }

            clearTimeout(progressTimeout);
            if (!isCompleted) {
                isCompleted = true;
                window.dispatchEvent(new CustomEvent('downloadComplete', {
                    detail: {
                        id: downloadId,
                        success: true
                    }
                }));
            }

            this.activeDownloads.delete(downloadId);
            window.removeEventListener('downloadCancel', handleCancel);

        } catch (error) {
            clearTimeout(progressTimeout);
            console.error('Download failed:', error);

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

    async downloadFolder(folderPath, folderName) {
        return this.downloadFile(folderPath, `${folderName}.zip`, 'folder');
    }

    cancelDownload(downloadId) {
        const abortController = this.activeDownloads.get(downloadId);
        if (abortController) {
            abortController.abort();
            this.activeDownloads.delete(downloadId);
        }
    }

    cancelAllDownloads() {
        for (const [id, abortController] of this.activeDownloads) {
            abortController.abort();
        }
        this.activeDownloads.clear();
    }
}
export const downloadManager = new DownloadManager();
export const downloadFile = (filePath, fileName) => {
    return downloadManager.downloadFile(filePath, fileName, 'file');
};

export const downloadFolder = (folderPath, folderName) => {
    return downloadManager.downloadFolder(folderPath, folderName);
};
