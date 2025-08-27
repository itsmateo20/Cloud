// components/app/DownloadManager.js
"use client";

import { useState, useEffect, useRef } from 'react';
import { Resizable } from "re-resizable";
import style from './DownloadManager.module.css';

export function DownloadManager() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [downloads, setDownloads] = useState([]);
    const [history, setHistory] = useState([]);
    const downloadRefs = useRef(new Map());

    useEffect(() => {
        const interval = setInterval(() => {
            setDownloads(prev => {
                const now = Date.now();
                const stalledDownloads = [];
                const activeDownloads = prev.filter(download => {
                    const timeSinceUpdate = now - (download.lastUpdate || download.startTime);
                    const isStalled = timeSinceUpdate > 30000;

                    if (isStalled && download.progress > 0 && download.progress < 100) {
                        stalledDownloads.push(download);
                        return false;
                    }
                    return true;
                });
                if (stalledDownloads.length > 0) {
                    setHistory(prevHistory => [
                        ...stalledDownloads.map(download => ({
                            ...download,
                            status: 'error',
                            error: 'Download cancelled or connection lost',
                            endTime: now
                        })),
                        ...prevHistory
                    ]);
                }

                return activeDownloads;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleDownloadStart = (event) => {
            const { id, fileName, fileSize, type } = event.detail;
            setDownloads(prev => {
                const existingIndex = prev.findIndex(d => d.id === id);
                if (existingIndex !== -1) {
                    return prev;
                }

                const newDownload = {
                    id,
                    fileName,
                    fileSize,
                    type,
                    progress: 0,
                    speed: 0,
                    timeRemaining: null,
                    status: 'downloading',
                    startTime: Date.now(),
                    downloadedBytes: 0
                };

                return [...prev, newDownload];
            });
        };

        const handleDownloadProgress = (event) => {
            const { id, loaded, total, speed } = event.detail;

            setDownloads(prev => prev.map(download => {
                if (download.id === id) {
                    const progress = total > 0 ? (loaded / total) * 100 : 0;
                    const timeRemaining = speed > 0 ? (total - loaded) / speed : null;

                    return {
                        ...download,
                        progress,
                        speed,
                        timeRemaining,
                        downloadedBytes: loaded,
                        lastUpdate: Date.now()
                    };
                }
                return download;
            }));
        };

        const handleDownloadComplete = (event) => {
            const { id, success, error } = event.detail;

            setDownloads(prev => {
                const download = prev.find(d => d.id === id);
                if (download) {
                    const completedDownload = {
                        ...download,
                        status: success ? 'completed' : 'error',
                        progress: success ? 100 : download.progress,
                        error: error || null,
                        endTime: Date.now()
                    };
                    setHistory(prevHistory => {
                        const alreadyInHistory = prevHistory.some(h => h.id === id);
                        if (!alreadyInHistory) {
                            return [completedDownload, ...prevHistory];
                        }
                        return prevHistory;
                    });
                    return prev.filter(d => d.id !== id);
                }
                return prev;
            });
        };

        window.addEventListener('downloadStart', handleDownloadStart);
        window.addEventListener('downloadProgress', handleDownloadProgress);
        window.addEventListener('downloadComplete', handleDownloadComplete);

        return () => {
            window.removeEventListener('downloadStart', handleDownloadStart);
            window.removeEventListener('downloadProgress', handleDownloadProgress);
            window.removeEventListener('downloadComplete', handleDownloadComplete);
        };
    }, []);

    const hasActiveDownloads = downloads.length > 0;
    const hasHistory = history.length > 0;

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSecond) => {
        return formatFileSize(bytesPerSecond) + '/s';
    };

    const formatTime = (seconds) => {
        if (!seconds || !isFinite(seconds)) return '--:--';

        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const cancelDownload = (id) => {
        const downloadRef = downloadRefs.current.get(id);
        if (downloadRef && downloadRef.abort) {
            downloadRef.abort();
        }

        setDownloads(prev => prev.filter(d => d.id !== id));
        window.dispatchEvent(new CustomEvent('downloadCancel', { detail: { id } }));
    };

    const clearHistory = () => {
        setHistory([]);
    };

    const retryDownload = (download) => {
        setHistory(prev => prev.filter(h => h.id !== download.id));
        window.dispatchEvent(new CustomEvent('downloadRetry', {
            detail: {
                fileName: download.fileName,
                type: download.type
            }
        }));
    };

    const getDownloadIcon = (type, status) => {
        if (status === 'completed') return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
        );

        if (status === 'error') return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
        );

        if (type === 'folder') return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
        );

        return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" fill="none" />
                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
        );
    };
    const getOverallProgress = () => {
        if (downloads.length === 0) return 0;
        const totalProgress = downloads.reduce((sum, download) => sum + download.progress, 0);
        return totalProgress / downloads.length;
    };

    const overallProgress = getOverallProgress();
    const shouldShowButton = hasActiveDownloads || hasHistory;

    if (!shouldShowButton) {
        return null;
    }

    return (
        <div className={style.downloadManager}>
            <button
                className={`${style.floatingButton} ${isExpanded ? style.expanded : ''} ${hasActiveDownloads ? style.hasActiveDownloads : ''}`}
                onClick={() => setIsExpanded(!isExpanded)}
                title={hasActiveDownloads ? `${downloads.length} active download${downloads.length > 1 ? 's' : ''} - ${Math.round(overallProgress)}%` : 'Download history'}
            >
                {hasActiveDownloads && !isExpanded && (
                    <div className={style.circularProgress}>
                        <svg className={style.progressCircle} width="56" height="56" viewBox="0 0 56 56">
                            <circle
                                className={style.progressTrack}
                                cx="28"
                                cy="28"
                                r="25"
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="3"
                            />
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
                        <div
                            className={style.verticalFill}
                            style={{ '--fill-height': `${overallProgress}%` }}
                        ></div>
                    </div>
                )}

                <div className={style.buttonContent}>
                    {hasActiveDownloads ? (
                        <div className={style.downloadingIcon}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M12 16l-5-5h3V3h4v8h3l-5 5z" fill="currentColor" />
                                <path d="M20 18H4v-7H2v9h20v-9h-2v7z" fill="currentColor" />
                            </svg>
                            {downloads.length > 1 && (
                                <span className={style.downloadCount}>{downloads.length}</span>
                            )}
                        </div>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="2" fill="none" />
                            <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                    )}
                </div>
            </button>

            {isExpanded && (shouldShowButton) && (
                <div className={style.panelContainer}>
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
                        <div className={style.downloadPanel}>
                            <div className={style.panelHeader}>
                                <h3>Downloads</h3>
                                {hasHistory && (
                                    <button
                                        className={style.clearButton}
                                        onClick={clearHistory}
                                        title="Clear history"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" fill="none" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            <div className={style.downloadList}>
                                {hasHistory && (
                                    <>
                                        <div className={style.sectionHeader}>
                                            <span className={style.sectionTitle}>Download History</span>
                                            <span className={style.sectionCount}>{history.length}</span>
                                        </div>

                                        <div className={style.historyList}>
                                            {history.map(download => (
                                                <div key={download.id} className={`${style.downloadItem} ${style.historyItem}`}>
                                                    <div className={style.downloadHeader}>
                                                        <div className={style.fileInfo}>
                                                            <div className={`${style.fileIcon} ${download.status === 'error' ? style.error : style.completed}`}>
                                                                {getDownloadIcon(download.type, download.status)}
                                                            </div>
                                                            <div className={style.fileName}>
                                                                {download.fileName}
                                                                {download.type === 'folder' && <span className={style.folderBadge}>ZIP</span>}
                                                            </div>
                                                        </div>
                                                        {download.status === 'error' && (
                                                            <button
                                                                className={style.retryButton}
                                                                onClick={() => retryDownload(download)}
                                                                title="Retry download"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                    <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 103.51 15" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className={style.historyStats}>
                                                        {download.status === 'completed' ? (
                                                            <span className={style.completedText}>
                                                                Downloaded {formatFileSize(download.fileSize || download.downloadedBytes)}
                                                            </span>
                                                        ) : (
                                                            <span className={style.errorText}>
                                                                Failed - {download.error || 'Unknown error'}
                                                            </span>
                                                        )}
                                                        <span className={style.downloadTime}>
                                                            {new Date(download.endTime || download.startTime).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {downloads.length > 0 && (
                                    <>
                                        <div className={style.sectionHeader}>
                                            <span className={style.sectionTitle}>Active Downloads</span>
                                            <span className={style.sectionCount}>{downloads.length}</span>
                                        </div>

                                        {downloads.map(download => (
                                            <div key={download.id} className={style.downloadItem}>
                                                <div className={style.downloadHeader}>
                                                    <div className={style.fileInfo}>
                                                        <div className={style.fileIcon}>
                                                            {getDownloadIcon(download.type, download.status)}
                                                        </div>
                                                        <div className={style.fileName}>
                                                            {download.fileName}
                                                            {download.type === 'folder' && <span className={style.folderBadge}>ZIP</span>}
                                                        </div>
                                                    </div>
                                                    <button
                                                        className={style.cancelButton}
                                                        onClick={() => cancelDownload(download.id)}
                                                        title="Cancel download"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                <div className={style.progressContainer}>
                                                    <div className={style.progressBar}>
                                                        <div
                                                            className={style.progressFill}
                                                            style={{ width: `${download.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className={style.progressText}>
                                                        {Math.round(download.progress)}%
                                                    </span>
                                                </div>

                                                <div className={style.downloadStats}>
                                                    <span className={style.downloadedSize}>
                                                        {formatFileSize(download.downloadedBytes)}
                                                        {download.fileSize > 0 && ` / ${formatFileSize(download.fileSize)}`}
                                                    </span>
                                                    {download.speed > 0 && (
                                                        <>
                                                            <span className={style.speed}>
                                                                {formatSpeed(download.speed)}
                                                            </span>
                                                            {download.timeRemaining && (
                                                                <span className={style.timeRemaining}>
                                                                    {formatTime(download.timeRemaining)}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
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
