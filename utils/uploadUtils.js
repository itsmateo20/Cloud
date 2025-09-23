// utils/uploadUtils.js

import { api } from './api';

export class Uploader {
    constructor() {
        this.uploadQueue = new Map();
        this.CHUNK_SIZE = 25 * 1024 * 1024;
        this.MAX_CONCURRENT_CHUNKS = 4;
        this.RETRY_ATTEMPTS = 3;
        this.RETRY_DELAY = 1000;
    }

    /**
     * Upload a single file with chunked upload for better performance
     * @param {File} file - The file to upload
     * @param {string} currentPath - The current folder path
     * @param {function} onProgress - Progress callback (uploaded, total, percentage)
     * @param {AbortSignal} signal - Abort signal for cancellation
     * @returns {Promise<{success: boolean, fileName?: string, error?: string}>}
     */
    async uploadFile(file, currentPath, onProgress, signal) {
        const uploadId = crypto.randomUUID();

        try {
            if (file.size < 50 * 1024 * 1024) {
                return await this.uploadFileRegular(file, currentPath, onProgress, signal);
            }

            return await this.uploadFileChunked(file, currentPath, onProgress, signal, uploadId);

        } catch (error) {

            if (error.name === 'AbortError') {
                return { success: false, error: 'Upload cancelled' };
            }

            return {
                success: false,
                error: error.message || 'Upload failed'
            };
        } finally {
            this.uploadQueue.delete(uploadId);
        }
    }

    /**
     * Regular upload for small files
     */
    async uploadFileRegular(file, currentPath, onProgress, signal) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('currentPath', currentPath);

        const result = await api.upload('/api/files', formData, { signal });

        if (onProgress) onProgress(file.size, file.size, 100);

        if (!result.success) {
            throw new Error(result.message || 'Upload failed');
        }

        return { success: true, fileName: file.name };
    }

    /**
     * Chunked upload for large files
     */
    async uploadFileChunked(file, currentPath, onProgress, signal, uploadId) {
        const chunks = this.createChunks(file);
        const uploadedChunks = new Set();
        let uploadedBytes = 0;

        this.uploadQueue.set(uploadId, {
            file,
            chunks,
            uploadedChunks,
            uploadedBytes,
            totalSize: file.size,
            signal
        });

        const initResponse = await this.initializeChunkedUpload(file, currentPath, signal);
        if (!initResponse.success) {
            throw new Error(initResponse.message || 'Failed to initialize upload');
        }

        const { uploadToken } = initResponse;

        try {
            await this.uploadChunksConcurrently(
                chunks,
                uploadToken,
                uploadId,
                (uploaded, total) => {
                    if (onProgress) {
                        const percentage = Math.round((uploaded / total) * 100);
                        onProgress(uploaded, total, percentage);
                    }
                },
                signal
            );

            const completeResponse = await this.completeChunkedUpload(uploadToken, signal);
            if (!completeResponse.success) {
                throw new Error(completeResponse.message || 'Failed to complete upload');
            }

            return { success: true, fileName: file.name };

        } catch (error) {
            await this.abortChunkedUpload(uploadToken).catch(() => { });
            throw error;
        }
    }

    /**
     * Create file chunks
     */
    createChunks(file) {
        const chunks = [];
        let offset = 0;
        let chunkNumber = 0;

        while (offset < file.size) {
            const chunkSize = Math.min(this.CHUNK_SIZE, file.size - offset);
            const chunk = file.slice(offset, offset + chunkSize);

            chunks.push({
                number: chunkNumber,
                blob: chunk,
                size: chunkSize,
                offset,
                retries: 0
            });

            offset += chunkSize;
            chunkNumber++;
        }

        return chunks;
    }

    /**
     * Initialize chunked upload session
     */
    async initializeChunkedUpload(file, currentPath, signal) {
        const response = await api.post('/api/files/upload/init', {
            fileName: file.name,
            fileSize: file.size,
            chunkCount: Math.ceil(file.size / this.CHUNK_SIZE),
            currentPath: currentPath,
            lastModified: file.lastModified
        }, { signal });

        return response;
    }

    /**
     * Upload chunks with concurrency control
     */
    async uploadChunksConcurrently(chunks, uploadToken, uploadId, onProgress, signal) {
        const uploadState = this.uploadQueue.get(uploadId);
        if (!uploadState) {
            throw new Error('Upload state not found');
        }

        let chunkIndex = 0;
        const activeUploads = new Set();

        return new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => { reject(new Error('Upload cancelled')); });

            const uploadNextChunk = async () => {
                if (signal.aborted) {
                    reject(new Error('Upload cancelled'));
                    return;
                }

                if (chunkIndex >= chunks.length) {
                    if (activeUploads.size === 0) resolve();
                    return;
                }

                const chunk = chunks[chunkIndex++];
                activeUploads.add(chunk.number);

                try {
                    await this.uploadSingleChunk(chunk, uploadToken, signal);

                    uploadState.uploadedChunks.add(chunk.number);
                    uploadState.uploadedBytes += chunk.size;

                    if (onProgress) onProgress(uploadState.uploadedBytes, uploadState.totalSize);

                } catch (error) {
                    if (chunk.retries < this.RETRY_ATTEMPTS) {
                        chunk.retries++;
                        chunkIndex--;

                        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * chunk.retries));
                    } else {
                        reject(error);
                        return;
                    }
                } finally {
                    activeUploads.delete(chunk.number);
                }

                uploadNextChunk();

                if (activeUploads.size === 0 && chunkIndex >= chunks.length) resolve();
            };

            for (let i = 0; i < this.MAX_CONCURRENT_CHUNKS; i++) {
                uploadNextChunk();
            }
        });
    }

    /**
     * Upload a single chunk
     */
    async uploadSingleChunk(chunk, uploadToken, signal) {
        const formData = new FormData();
        formData.append('chunk', chunk.blob);
        formData.append('chunkNumber', chunk.number.toString());
        formData.append('uploadToken', uploadToken);

        const result = await api.upload('/api/files/upload/chunk', formData, { signal });

        if (!result.success) {
            throw new Error(result.message || `Chunk ${chunk.number} upload failed`);
        }

        return result;
    }

    /**
     * Complete chunked upload
     */
    async completeChunkedUpload(uploadToken, signal) {
        const result = await api.post('/api/files/upload/complete', {
            uploadToken
        }, { signal });

        return result;
    }

    /**
     * Abort chunked upload
     */
    async abortChunkedUpload(uploadToken) {
        try {
            await api.post('/api/files/upload/abort', { uploadToken });
        } catch (error) {}
    }

    /**
     * Upload multiple files sequentially with progress tracking
     * @param {FileList|File[]} files - Files to upload
     * @param {string} currentPath - Current folder path
     * @param {function} onProgress - Progress callback (fileIndex, fileName, fileProgress, overallProgress)
     * @param {AbortSignal} signal - Abort signal
     * @returns {Promise<{success: boolean, results: Array, errors: Array}>}
     */
    async uploadFiles(files, currentPath, onProgress, signal) {
        const fileArray = Array.from(files);
        const results = [];
        const errors = [];

        let totalSize = 0;
        let uploadedSize = 0;

        for (const file of fileArray) {
            totalSize += file.size;
        }

        for (let i = 0; i < fileArray.length; i++) {
            if (signal.aborted) {
                break;
            }

            const file = fileArray[i];
            const fileStartSize = uploadedSize;

            try {
                const result = await this.uploadFile(
                    file,
                    currentPath,
                    (fileUploaded, fileTotal, filePercentage) => {
                        const currentTotalUploaded = fileStartSize + fileUploaded;
                        const overallPercentage = Math.round((currentTotalUploaded / totalSize) * 100);

                        if (onProgress) {
                            onProgress(
                                i,
                                file.name,
                                filePercentage,
                                overallPercentage,
                                fileArray.length
                            );
                        }
                    },
                    signal
                );

                results.push(result);
                uploadedSize += file.size;

                if (!result.success) {
                    errors.push({
                        fileName: file.name,
                        error: result.error
                    });
                }

            } catch (error) {
                const errorResult = {
                    success: false,
                    fileName: file.name,
                    error: error.message
                };

                results.push(errorResult);
                errors.push({
                    fileName: file.name,
                    error: error.message
                });
            }
        }

        return {
            success: errors.length === 0,
            results,
            errors,
            totalFiles: fileArray.length,
            successfulFiles: results.filter(r => r.success).length
        };
    }

    /**
     * Cancel an ongoing upload
     */
    cancelUpload(uploadId) {
        const uploadState = this.uploadQueue.get(uploadId);
        if (uploadState && uploadState.signal) {
            uploadState.signal.abort();
        }
    }

    /**
     * Get upload progress for a specific upload
     */
    getUploadProgress(uploadId) {
        const uploadState = this.uploadQueue.get(uploadId);
        if (!uploadState) return null;

        return {
            uploadedBytes: uploadState.uploadedBytes,
            totalBytes: uploadState.totalSize,
            percentage: Math.round((uploadState.uploadedBytes / uploadState.totalSize) * 100),
            chunksCompleted: uploadState.uploadedChunks.size,
            totalChunks: uploadState.chunks.length
        };
    }
}

export const uploader = new Uploader();

export const uploadFile = (file, currentPath, onProgress, signal) => {
    return uploader.uploadFile(file, currentPath, onProgress, signal);
};

export const uploadFiles = (files, currentPath, onProgress, signal) => {
    return uploader.uploadFiles(files, currentPath, onProgress, signal);
};
