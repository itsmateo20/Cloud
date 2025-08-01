'use client';

// components/qr/QRHandler.js

import { useState } from 'react';
import { api } from '@/utils/api';
import styles from './QRHandler.module.css';

export default function QRHandler({ token, type, data }) {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [message, setMessage] = useState('');

    const handleFileSelect = (event) => {
        const selectedFiles = Array.from(event.target.files);
        setFiles(selectedFiles);
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            setMessage('Please select files to upload');
            return;
        }

        setUploading(true);
        setMessage('');

        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });
            formData.append('token', token);
            formData.append('targetPath', data.targetPath);

            const result = await api.upload('/api/qr/upload', formData);

            if (result.success) {
                setMessage(`Successfully uploaded ${files.length} file(s)!`);
                setFiles([]);
                // Reset file input
                document.getElementById('fileInput').value = '';
            } else {
                setMessage(`Upload failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            setMessage('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (item) => {
        setDownloading(true);
        setMessage('');

        try {
            const result = await api.downloadBlob('/api/qr/download', { token, path: item.path });

            if (result.success) {
                const url = window.URL.createObjectURL(result.blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = item.name;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setMessage(`Downloaded ${item.name} successfully!`);
            } else {
                setMessage(`Download failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Download error:', error);
            setMessage('Download failed. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    const downloadAll = async () => {
        setDownloading(true);
        setMessage('');

        try {
            const result = await api.downloadBlob('/api/qr/download', {
                token,
                downloadAll: true
            });

            if (result.success) {
                const url = window.URL.createObjectURL(result.blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'files.zip';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setMessage('Downloaded all files successfully!');
            } else {
                setMessage(`Download failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Download error:', error);
            setMessage('Download failed. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.card}>
                    <h1 className={styles.title}>
                        {type === 'upload' ? 'Upload Files' : 'Download Files'}
                    </h1>

                    {message && (
                        <div className={`${styles.message} ${message.includes('failed') || message.includes('Error')
                            ? styles.messageError
                            : styles.messageSuccess
                            }`}>
                            {message}
                        </div>
                    )}

                    {type === 'upload' && (
                        <div className={styles.uploadSection}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>
                                    Select files to upload to: <span className={styles.targetPath}>{data.targetPath}</span>
                                </label>
                                <input
                                    id="fileInput"
                                    type="file"
                                    multiple
                                    onChange={handleFileSelect}
                                    className={styles.fileInput}
                                />
                            </div>

                            {files.length > 0 && (
                                <div className={styles.selectedFiles}>
                                    <h3 className={styles.selectedFilesTitle}>Selected files:</h3>
                                    <ul className={styles.filesList}>
                                        {files.map((file, index) => (
                                            <li key={index} className={styles.fileItem}>
                                                <span>{file.name}</span>
                                                <span className={styles.fileSize}>
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={handleUpload}
                                disabled={uploading || files.length === 0}
                                className={styles.uploadButton}
                            >
                                {uploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
                            </button>
                        </div>
                    )}

                    {type === 'download' && (
                        <div className={styles.downloadSection}>
                            <div>
                                <h3 className={styles.sectionTitle}>Available files:</h3>
                                <div className={styles.itemsList}>
                                    {data.items.map((item, index) => (
                                        <div key={index} className={styles.downloadItem}>
                                            <div className={styles.itemInfo}>
                                                <span className={styles.itemName}>{item.name}</span>
                                                <span className={styles.itemType}>({item.type})</span>
                                            </div>
                                            <button
                                                onClick={() => handleDownload(item)}
                                                disabled={downloading}
                                                className={styles.downloadButton}
                                            >
                                                {downloading ? 'Downloading...' : 'Download'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {data.items.length > 1 && (
                                <button
                                    onClick={downloadAll}
                                    disabled={downloading}
                                    className={styles.downloadAllButton}
                                >
                                    {downloading ? 'Preparing download...' : 'Download All as ZIP'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
