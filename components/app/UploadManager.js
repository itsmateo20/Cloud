"use client";

import { useState, useEffect } from 'react';
import { Resizable } from "re-resizable";
import style from './UploadManager.module.css';
import { useIsMobile } from '@/utils/useIsMobile';

const MAX_HISTORY_ITEMS = 200;

export function UploadManager() {
    const isMobile = useIsMobile();
    const [isExpanded, setIsExpanded] = useState(false);
    const [uploads, setUploads] = useState([]);
    const [history, setHistory] = useState([]);
    const [isDownloadManagerVisible, setIsDownloadManagerVisible] = useState(false);

    useEffect(() => {
        const handleDownloadManagerVisibility = (event) => {
            setIsDownloadManagerVisible(Boolean(event?.detail?.visible));
        };

        window.addEventListener('downloadManagerVisibility', handleDownloadManagerVisibility);
        return () => window.removeEventListener('downloadManagerVisibility', handleDownloadManagerVisibility);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setUploads(prev => {
                const now = Date.now();
                const stalledUploads = [];
                const activeUploads = prev.filter(upload => {
                    const timeSinceUpdate = now - (upload.lastUpdate || upload.startTime);
                    const isStalled = timeSinceUpdate > 30000;

                    if (isStalled && upload.progress > 0 && upload.progress < 100) {
                        stalledUploads.push(upload);
                        return false;
                    }
                    return true;
                });

                if (stalledUploads.length > 0) {
                    setHistory(prevHistory => [
                        ...stalledUploads.map(upload => ({
                            ...upload,
                            status: 'error',
                            error: 'Upload cancelled or connection lost',
                            endTime: now
                        })),
                        ...prevHistory
                    ].slice(0, MAX_HISTORY_ITEMS));
                }

                return activeUploads;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleUploadStart = (event) => {
            const { id, fileName, fileSize, type } = event.detail;
            setUploads(prev => {
                const existingIndex = prev.findIndex(u => u.id === id);
                if (existingIndex !== -1) return prev;

                const newUpload = {
                    id,
                    fileName,
                    fileSize,
                    type,
                    progress: 0,
                    speed: 0,
                    timeRemaining: null,
                    status: 'uploading',
                    startTime: Date.now(),
                    uploadedBytes: 0
                };

                return [...prev, newUpload];
            });
        };

        const handleUploadProgress = (event) => {
            const { id, loaded, total, speed } = event.detail;

            setUploads(prev => prev.map(upload => {
                if (upload.id === id) {
                    const progress = total > 0 ? (loaded / total) * 100 : 0;
                    const timeRemaining = speed > 0 ? (total - loaded) / speed : null;

                    return {
                        ...upload,
                        progress,
                        speed: speed || upload.speed,
                        timeRemaining,
                        uploadedBytes: loaded,
                        lastUpdate: Date.now()
                    };
                }
                return upload;
            }));
        };

        const handleUploadComplete = (event) => {
            const { id, success, error } = event.detail;

            setUploads(prev => {
                const upload = prev.find(u => u.id === id);
                if (!upload) return prev;

                const completedUpload = {
                    ...upload,
                    status: success ? 'completed' : 'error',
                    progress: success ? 100 : upload.progress,
                    error: error || null,
                    endTime: Date.now()
                };

                setHistory(prevHistory => {
                    const alreadyInHistory = prevHistory.some(h => h.id === id);
                    if (!alreadyInHistory) return [completedUpload, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
                    return prevHistory;
                });

                return prev.filter(u => u.id !== id);
            });
        };

        window.addEventListener('uploadStart', handleUploadStart);
        window.addEventListener('uploadProgress', handleUploadProgress);
        window.addEventListener('uploadComplete', handleUploadComplete);

        return () => {
            window.removeEventListener('uploadStart', handleUploadStart);
            window.removeEventListener('uploadProgress', handleUploadProgress);
            window.removeEventListener('uploadComplete', handleUploadComplete);
        };
    }, []);

    const hasActiveUploads = uploads.length > 0;
    const hasHistory = history.length > 0;
    const shouldShowButton = hasActiveUploads || hasHistory;

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('uploadManagerVisibility', {
            detail: {
                visible: shouldShowButton,
                expanded: shouldShowButton ? isExpanded : false
            }
        }));

        return () => {
            window.dispatchEvent(new CustomEvent('uploadManagerVisibility', {
                detail: { visible: false, expanded: false }
            }));
        };
    }, [shouldShowButton, isExpanded]);

    useEffect(() => {
        const handleToggleRequest = () => {
            if (!shouldShowButton) return;
            setIsExpanded(prev => !prev);
        };

        window.addEventListener('uploadManagerToggleRequest', handleToggleRequest);
        return () => window.removeEventListener('uploadManagerToggleRequest', handleToggleRequest);
    }, [shouldShowButton]);

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSecond) => formatFileSize(bytesPerSecond) + '/s';

    const formatTime = (seconds) => {
        if (!seconds || !isFinite(seconds)) return '--:--';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const clearHistory = () => {
        setHistory([]);
    };

    const getUploadIcon = (status) => {
        if (status === 'completed') {
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
            );
        }

        if (status === 'error') {
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
            );
        }

        return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M4 19h16" stroke="currentColor" strokeWidth="2" />
            </svg>
        );
    };

    const getOverallProgress = () => {
        if (uploads.length === 0) return 0;
        const totalProgress = uploads.reduce((sum, upload) => sum + upload.progress, 0);
        return totalProgress / uploads.length;
    };

    const overallProgress = getOverallProgress();

    if (isMobile || !shouldShowButton) return null;

    const rightOffset = isDownloadManagerVisible ? 92 : 20;

    return (
        <div className={style.uploadManager} style={{ right: `${rightOffset}px` }}>
            <button
                className={`${style.floatingButton} ${isExpanded ? style.expanded : ''} ${hasActiveUploads ? style.hasActiveUploads : ''}`}
                onClick={() => setIsExpanded(prev => !prev)}
                title={hasActiveUploads ? `${uploads.length} active upload${uploads.length > 1 ? 's' : ''} - ${Math.round(overallProgress)}%` : 'Upload history'}
            >
                {hasActiveUploads && !isExpanded && (
                    <div className={style.circularProgress}>
                        <svg className={style.progressCircle} width="56" height="56" viewBox="0 0 56 56">
                            <circle className={style.progressTrack} cx="28" cy="28" r="25" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                            <circle
                                className={style.progressBar}
                                cx="28"
                                cy="28"
                                r="25"
                                fill="none"
                                stroke="rgba(255,255,255,0.8)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={`${157.08}`}
                                strokeDashoffset={`${157.08 - (157.08 * overallProgress) / 100}`}
                                transform="rotate(-90 28 28)"
                            />
                        </svg>
                        <div className={style.verticalFill} style={{ '--fill-height': `${overallProgress}%` }}></div>
                    </div>
                )}

                <div className={style.buttonContent}>
                    {hasActiveUploads ? (
                        <div className={style.uploadingIcon}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M12 8l5 5h-3v8h-4v-8H7l5-5z" fill="currentColor" />
                                <path d="M20 6H4v2h16V6z" fill="currentColor" />
                            </svg>
                            {uploads.length > 1 && <span className={style.uploadCount}>{uploads.length}</span>}
                        </div>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 3v12m0-12l4 4m-4-4L8 7" stroke="currentColor" strokeWidth="2" fill="none" />
                            <path d="M4 21h16" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    )}
                </div>
            </button>

            {isExpanded && (
                <div className={style.panelContainer} style={{ right: `${rightOffset}px` }}>
                    <Resizable
                        height={0}
                        minWidth={300}
                        maxWidth={800}
                        enable={{
                            top: false,
                            right: false,
                            bottom: false,
                            left: true,
                            topRight: false,
                            bottomRight: false,
                            bottomLeft: false,
                            topLeft: false
                        }}
                        className={style.resizableContainer}
                    >
                        <div className={style.uploadPanel}>
                            <div className={style.panelHeader}>
                                <h3>Uploads</h3>
                                {hasHistory && (
                                    <button className={style.clearButton} onClick={clearHistory} title="Clear history">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" fill="none" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            <div className={style.uploadList}>
                                {hasHistory && (
                                    <>
                                        <div className={style.sectionHeader}>
                                            <span className={style.sectionTitle}>Upload History</span>
                                            <span className={style.sectionCount}>{history.length}</span>
                                        </div>

                                        <div className={style.historyList}>
                                            {history.map(upload => (
                                                <div key={upload.id} className={`${style.uploadItem} ${style.historyItem}`}>
                                                    <div className={style.uploadHeader}>
                                                        <div className={style.fileInfo}>
                                                            <div className={`${style.fileIcon} ${upload.status === 'error' ? style.error : style.completed}`}>
                                                                {getUploadIcon(upload.status)}
                                                            </div>
                                                            <div className={style.fileName}>{upload.fileName}</div>
                                                        </div>
                                                    </div>

                                                    <div className={style.historyStats}>
                                                        {upload.status === 'completed' ? (
                                                            <span className={style.completedText}>Uploaded {formatFileSize(upload.fileSize || upload.uploadedBytes)}</span>
                                                        ) : (
                                                            <span className={style.errorText}>Failed - {upload.error || 'Unknown error'}</span>
                                                        )}
                                                        <span className={style.uploadTime}>{new Date(upload.endTime || upload.startTime).toLocaleTimeString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {uploads.length > 0 && (
                                    <>
                                        <div className={style.sectionHeader}>
                                            <span className={style.sectionTitle}>Active Uploads</span>
                                            <span className={style.sectionCount}>{uploads.length}</span>
                                        </div>

                                        {uploads.map(upload => (
                                            <div key={upload.id} className={style.uploadItem}>
                                                <div className={style.uploadHeader}>
                                                    <div className={style.fileInfo}>
                                                        <div className={style.fileIcon}>{getUploadIcon(upload.status)}</div>
                                                        <div className={style.fileName}>{upload.fileName}</div>
                                                    </div>
                                                </div>

                                                <div className={style.progressContainer}>
                                                    <div className={style.progressBar}>
                                                        <div className={style.progressFill} style={{ width: `${upload.progress}%` }} />
                                                    </div>
                                                    <span className={style.progressText}>{Math.round(upload.progress)}%</span>
                                                </div>

                                                <div className={style.uploadStats}>
                                                    <span className={style.uploadedSize}>{formatFileSize(upload.uploadedBytes)} / {formatFileSize(upload.fileSize || 0)}</span>
                                                    <span className={style.speed}>{upload.speed > 0 ? formatSpeed(upload.speed) : '--'}</span>
                                                    <span className={style.timeRemaining}>{formatTime(upload.timeRemaining)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    </Resizable>
                </div>
            )}
        </div>
    );
}
