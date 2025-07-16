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

        try {
            window.dispatchEvent(new CustomEvent('downloadStart', {
                detail: {
                    id: downloadId,
                    fileName,
                    fileSize: 0, // Will be updated when we get the response
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
                ? `/api/files/download?path=${encodeURIComponent(filePath)}&type=folder`
                : `/api/files/download?path=${encodeURIComponent(filePath)}`;
            const response = await fetch(url, {
                signal: abortController.signal
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status} ${response.statusText}`);
            }
            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;
            window.dispatchEvent(new CustomEvent('downloadProgress', {
                detail: {
                    id: downloadId,
                    loaded: 0,
                    total,
                    speed: 0
                }
            }));
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
                }
            }
            const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
            const downloadUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            window.dispatchEvent(new CustomEvent('downloadComplete', {
                detail: {
                    id: downloadId,
                    success: true
                }
            }));

            this.activeDownloads.delete(downloadId);
            window.removeEventListener('downloadCancel', handleCancel);

        } catch (error) {
            console.error('Download failed:', error);

            window.dispatchEvent(new CustomEvent('downloadComplete', {
                detail: {
                    id: downloadId,
                    success: false,
                    error: error.name === 'AbortError' ? 'Download cancelled' : error.message
                }
            }));

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
