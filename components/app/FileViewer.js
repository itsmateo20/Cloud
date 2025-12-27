// components/app/FileViewer.js
"use client";

import style from './FileViewer.module.css';
import mainStyle from '@/public/styles/main.module.css';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import SoftLoading from '@/components/SoftLoading';
import { CodeEditor } from './CodeEditor';
import { downloadFile } from '@/utils/downloadUtils';
import { api } from '@/utils/api';
import { useIsMobile } from '@/utils/useIsMobile';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-scala';
import 'prismjs/components/prism-lua';
import 'prismjs/components/prism-perl';
import 'prismjs/components/prism-powershell';
import {
    FastForward,
    Pause,
    Play,
    Redo2,
    Undo2,
    X,
    ChevronLeft,
    ChevronRight,
    Info,
    Download,
    Trash2,
    Edit,
    MoreVertical,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Volume2,
    VolumeX,
    Maximize,
    ArrowLeft,
    ArrowRight,
    Star,
    Eye,
    FileText
} from 'lucide-react';

export function FileViewer({
    isOpen,
    currentFileIndex,
    files,
    onClose,
    onNavigate,
    onAction,
    mobile = false
}) {
    const isMobile = useIsMobile();
    const [isLoading, setIsLoading] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);
    const [fileError, setFileError] = useState(false);
    const [fileContent, setFileContent] = useState('');
    const [imageScale, setImageScale] = useState(1);
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showCodeEditor, setShowCodeEditor] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isVideoVertical, setIsVideoVertical] = useState(false);
    const [isDraggingProgress, setIsDraggingProgress] = useState(false);
    const [showFileInfoModal, setShowFileInfoModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [fileInfoMenuSwipePosition, setFileInfoMenuSwipePosition] = useState(0);
    const [fileInfoMenuInitialY, setFileInfoMenuInitialY] = useState(0);
    const [deleteMenuSwipePosition, setDeleteMenuSwipePosition] = useState(0);
    const [deleteMenuInitialY, setDeleteMenuInitialY] = useState(0);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
    const [isEmpty, setIsEmpty] = useState(false);
    const [isHtmlPreview, setIsHtmlPreview] = useState(false);
    const [autoFitImage, setAutoFitImage] = useState(false);
    const [fileMetadata, setFileMetadata] = useState(null);
    const [metadataLoading, setMetadataLoading] = useState(false);
    const imagePositionRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef(null);
    const videoRef = useRef(null);
    const progressBarRef = useRef(null);

    const contentRef = useRef(null);
    const containerRef = useRef(null);
    const sidePanelRef = useRef(null);
    const lastFocusedElementRef = useRef(null);
    const dropdownRef = useRef(null);

    const toggleVideoPlay = () => {
        if (videoRef.current) {
            if (isVideoPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsVideoPlaying(!isVideoPlaying);
        }
    };

    const seekVideo = (seconds) => {
        if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            const duration = videoRef.current.duration || videoDuration;

            if (!duration || isNaN(duration)) return;

            const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
            videoRef.current.currentTime = newTime;
        }
    };

    const restartVideo = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
        }
    };

    const goToNextVideo = () => {
        if (currentFileIndex < files.length - 1) {
            const nextIndex = currentFileIndex + 1;
            for (let i = nextIndex; i < files.length; i++) {
                if (getFileType(files[i].name) === 'video') {
                    onNavigate(i);
                    return;
                }
            }
        }
    };

    const goToPreviousFile = () => {
        if (currentFileIndex > 0) {
            onNavigate(currentFileIndex - 1);
        }
    };

    const goToNextFile = () => {
        if (currentFileIndex < files.length - 1) {
            onNavigate(currentFileIndex + 1);
        }
    };

    const handleVideoTimeUpdate = () => {
        if (videoRef.current) {
            setVideoCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleVideoLoadedMetadata = () => {
        if (videoRef.current) {
            const duration = videoRef.current.duration;
            if (!isNaN(duration) && duration > 0) {
                setVideoDuration(duration);
            }
        }
    };

    const handleProgressBarClick = (e) => {
        e.stopPropagation();
        if (videoRef.current && progressBarRef.current && videoDuration > 0) {
            const rect = progressBarRef.current.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newTime = percent * videoDuration;
            videoRef.current.currentTime = newTime;
            setVideoCurrentTime(newTime);
        }
    };

    const handleProgressBarMouseDown = (e) => {
        e.stopPropagation();
        setIsDraggingProgress(true);
        handleProgressBarClick(e);
    };

    const handleProgressBarMouseMove = (e) => {
        if (isDraggingProgress && videoRef.current && progressBarRef.current && videoDuration > 0) {
            const rect = progressBarRef.current.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newTime = percent * videoDuration;
            videoRef.current.currentTime = newTime;
            setVideoCurrentTime(newTime);
        }
    };

    const handleProgressBarMouseUp = () => {
        setIsDraggingProgress(false);
    };

    useEffect(() => {
        if (isDraggingProgress) {
            const handleMouseMove = (e) => handleProgressBarMouseMove(e);
            const handleMouseUp = () => handleProgressBarMouseUp();

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDraggingProgress, videoDuration]);

    const toggleVideoOrientation = () => {
        setIsVideoVertical(!isVideoVertical);
    };

    const toggleVideoMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsVideoMuted(videoRef.current.muted);
        }
    };

    const toggleVideoFullscreen = () => {
        if (videoRef.current) {
            if (!isVideoFullscreen) {
                videoRef.current.controls = true;
                setIsVideoFullscreen(true);
                setShowControls(false);
                if (videoRef.current.requestFullscreen) {
                    videoRef.current.requestFullscreen();
                } else if (videoRef.current.webkitRequestFullscreen) {
                    videoRef.current.webkitRequestFullscreen();
                } else if (videoRef.current.msRequestFullscreen) {
                    videoRef.current.msRequestFullscreen();
                }
            } else {
                videoRef.current.controls = false;
                setIsVideoFullscreen(false);
                setShowControls(true);
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
            if (!isFullscreen && isVideoFullscreen) {
                setIsVideoFullscreen(false);
                setShowControls(true);
                if (videoRef.current) {
                    videoRef.current.controls = false;
                }
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        };
    }, [isVideoFullscreen]);

    const handleVideoClick = () => {
        setShowControls(!showControls);
    };

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const toggleControls = () => {
        const fileType = getFileType(currentFile?.name);
        if (fileType === 'image' || fileType === 'video') {
            setShowControls(!showControls);
        }
    };

    const handleFileInfo = async () => {
        lastFocusedElementRef.current = document.activeElement;
        setShowFileInfoModal(true);
        setShowDropdown(false);

        if (currentFile && !fileMetadata) {
            setMetadataLoading(true);
            try {
                const response = await api.get(`/api/files/metadata?path=${encodeURIComponent(currentFile.path)}`);
                if (response.success) {
                    setFileMetadata(response.metadata);
                }
            } catch (error) {
                console.error('Failed to fetch file metadata:', error);
            } finally {
                setMetadataLoading(false);
            }
        }
    };

    const handleDeleteConfirm = () => {
        setShowDeleteModal(true);
        setShowDropdown(false);
    };

    const confirmDelete = () => {
        handleAction('delete');
        setShowDeleteModal(false);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const hasGPSData = (file) => {
        return fileMetadata?.gps && (fileMetadata.gps.latitude || fileMetadata.gps.longitude);
    };

    const formatGPS = (lat, lng) => {
        if (!lat || !lng) return null;
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    };

    const currentFile = files[currentFileIndex];
    const getStreamUrl = (file) => {
        const params = new URLSearchParams();
        params.set('path', file.path);
        return `/api/files/stream?${params.toString()}`;
    };
    const getDownloadUrl = (file) => {
        const params = new URLSearchParams();
        params.set('path', file.path);
        return `/api/files/download?${params.toString()}`;
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (showCodeEditor) return;
            switch (e.key) {
                case 'Escape':
                    if (showFileInfoModal) {
                        setShowFileInfoModal(false);
                        if (lastFocusedElementRef.current && lastFocusedElementRef.current.focus) {
                            lastFocusedElementRef.current.focus();
                        }
                    } else {
                        onClose();
                    }
                    break;
                case 'ArrowLeft':
                case '<':
                case ',':
                case 'a':
                case 'A':
                    if (currentFileIndex > 0) {
                        onNavigate(currentFileIndex - 1);
                    }
                    break;
                case 'ArrowRight':
                case '>':
                case '.':
                case 'd':
                case 'D':
                    if (currentFileIndex < files.length - 1) {
                        onNavigate(currentFileIndex + 1);
                    }
                    break;
                case '+':
                case '=':
                    if (getFileType(currentFile?.name) === 'image') {
                        handleZoomIn();
                    }
                    break;
                case '-':
                case '_':
                    if (getFileType(currentFile?.name) === 'image') {
                        handleZoomOut();
                    }
                    break;
                case '0':
                    if (getFileType(currentFile?.name) === 'image') {
                        resetZoom();
                    }
                    break;
                case 'f':
                case 'F':
                    if (getFileType(currentFile?.name) === 'video') {
                        toggleVideoFullscreen();
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    if (getFileType(currentFile?.name) === 'video') {
                        toggleVideoPlay();
                    }
                    break;
                case 'm':
                case 'M':
                    if (getFileType(currentFile?.name) === 'video') {
                        toggleVideoMute();
                    }
                    break;
                case 'r':
                case 'R':
                    if (getFileType(currentFile?.name) === 'video') {
                        restartVideo();
                    }
                    break;
                case 'ArrowUp':
                    if (getFileType(currentFile?.name) === 'video' && videoRef.current) {
                        e.preventDefault();
                        videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1);
                    }
                    break;
                case 'ArrowDown':
                    if (getFileType(currentFile?.name) === 'video' && videoRef.current) {
                        e.preventDefault();
                        videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1);
                    }
                    break;
                case 'j':
                case 'J':
                    if (getFileType(currentFile?.name) === 'video') {
                        seekVideo(-10);
                    }
                    break;
                case 'l':
                case 'L':
                    if (getFileType(currentFile?.name) === 'video') {
                        seekVideo(10);
                    }
                    break;
            }
        };
        const handleWheel = (e) => {
            if (getFileType(currentFile?.name) === 'image') {
                e.preventDefault();
                if (e.deltaY < 0) handleZoomIn();
                else handleZoomOut();
            }
        };

        if (containerRef.current) containerRef.current.addEventListener('wheel', handleWheel, { passive: false });

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isOpen, currentFileIndex, files.length, onClose, onNavigate, showFileInfoModal, showCodeEditor]);

    useEffect(() => {
        if (!sidePanelRef.current) return;
        const el = sidePanelRef.current;
        const updateWidth = () => {
            const w = el.getBoundingClientRect().width;
            if (containerRef.current) {
                containerRef.current.style.setProperty('--fv-side-panel-width', w + 'px');
            }
        };
        updateWidth();
        const ro = new ResizeObserver(updateWidth);
        ro.observe(el);
        return () => ro.disconnect();
    }, [showFileInfoModal]);

    useEffect(() => {
        if (showFileInfoModal && sidePanelRef.current) {
            const heading = sidePanelRef.current.querySelector('h3');
            if (heading) heading.focus?.();
        }
    }, [showFileInfoModal]);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setFileError(false);
            setIsEmpty(false);
            setFileContent('');
            setAutoFitImage(false);
            setFileMetadata(null);
            setMetadataLoading(false);
            resetZoom();

            setIsVideoPlaying(false);
            setVideoCurrentTime(0);
            setVideoDuration(0);
            setIsVideoMuted(false);
            setIsVideoFullscreen(false);

            setIsHtmlPreview(false);

            if (currentFile) {
                loadFileContent(currentFile);
                
                setTimeout(() => {
                    if (currentFileIndex > 0 && files[currentFileIndex - 1]) {
                        preloadFile(files[currentFileIndex - 1]);
                    }
                    if (currentFileIndex > 1 && files[currentFileIndex - 2]) {
                        preloadFile(files[currentFileIndex - 2]);
                    }
                    if (currentFileIndex < files.length - 1 && files[currentFileIndex + 1]) {
                        preloadFile(files[currentFileIndex + 1]);
                    }
                    if (currentFileIndex < files.length - 2 && files[currentFileIndex + 2]) {
                        preloadFile(files[currentFileIndex + 2]);
                    }
                }, 300);
            }
        }
    }, [currentFileIndex, isOpen]);

    const preloadFile = (file) => {
        if (!file) return;
        
        const fileType = getFileType(file.name);
        
        if (fileType === 'image') {
            const img = new Image();
            img.src = getDownloadUrl(file);
        } else if (fileType === 'video') {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = getDownloadUrl(file);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowDropdown(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    useEffect(() => {
        imagePositionRef.current = imagePosition;
    }, [imagePosition]);
    useEffect(() => {
        if (contentRef.current) {
            updateImageTransform(imageScale, imagePositionRef.current);
        }
    }, [imageScale]);

    const handleFileInfoMenuTouchStart = (e) => {
        const touch = e.touches[0];
        setFileInfoMenuInitialY(touch.clientY);
    };

    const handleFileInfoMenuTouchMove = (e) => {
        const touch = e.touches[0];
        const deltaY = touch.clientY - fileInfoMenuInitialY;
        if (deltaY > 0) {
            setFileInfoMenuSwipePosition(deltaY);
        }
    };

    const handleFileInfoMenuTouchEnd = () => {
        if (fileInfoMenuSwipePosition > 100) {
            setShowFileInfoModal(false);
        }
        setFileInfoMenuSwipePosition(0);
        setFileInfoMenuInitialY(0);
    };

    const handleDeleteMenuTouchStart = (e) => {
        const touch = e.touches[0];
        setDeleteMenuInitialY(touch.clientY);
    };

    const handleDeleteMenuTouchMove = (e) => {
        const touch = e.touches[0];
        const deltaY = touch.clientY - deleteMenuInitialY;
        if (deltaY > 0) {
            setDeleteMenuSwipePosition(deltaY);
        }
    };

    const handleDeleteMenuTouchEnd = () => {
        if (deleteMenuSwipePosition > 100) {
            setShowDeleteModal(false);
        }
        setDeleteMenuSwipePosition(0);
        setDeleteMenuInitialY(0);
    };

    const [swipeStartX, setSwipeStartX] = useState(0);
    const [swipeStartY, setSwipeStartY] = useState(0);
    const [isSwipingFile, setIsSwipingFile] = useState(false);

    const handleFileSwipeStart = (e) => {
        if (mobile) {
            const touch = e.touches[0];
            setSwipeStartX(touch.clientX);
            setSwipeStartY(touch.clientY);
            setIsSwipingFile(false);
        }
    };

    const handleFileSwipeMove = (e) => {
        if (mobile && swipeStartX) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - swipeStartX;
            const deltaY = touch.clientY - swipeStartY;

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                setIsSwipingFile(true);
            }
        }
    };

    const handleFileSwipeEnd = (e) => {
        if (mobile && swipeStartX && isSwipingFile) {
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - swipeStartX;

            if (deltaX > 100 && currentFileIndex > 0) {
                goToPreviousFile();
            }
            else if (deltaX < -100 && currentFileIndex < files.length - 1) {
                goToNextFile();
            }
        }

        setSwipeStartX(0);
        setSwipeStartY(0);
        setIsSwipingFile(false);
    };

    const getFileType = (filename) => {
        if (!filename) return 'unknown';

        const ext = filename.split('.').pop()?.toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
            return 'image';
        }
        if (['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext)) {
            return 'video';
        }
        if (['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(ext)) {
            return 'text';
        }
        if (['js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'sass', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'sql', 'sh', 'bash', 'ps1', 'yml', 'yaml', 'toml', 'ini', 'cfg'].includes(ext)) {
            return 'code';
        }
        if (ext === 'pdf') {
            return 'pdf';
        }

        return 'unknown';
    };

    const isFileTooBig = (file) => {
        if (!file || !file.size) return false;

        const fileType = getFileType(file.name);
        const size = file.size;
        const limits = {
            image: 1000 * 1024 * 1024,
            video: 5000 * 1024 * 1024,
            text: 1000 * 1024 * 1024,
            code: 1000 * 1024 * 1024,
            pdf: 1000 * 1024 * 1024,
            unknown: 0
        };

        return size > (limits[fileType] || 0);
    };

    const loadFileContent = async (file) => {
        if (file.size === 0) {
            setIsEmpty(true);
            setIsLoading(false);
            return;
        }

        const fileType = getFileType(file.name);

        if (['text', 'code'].includes(fileType)) {
            try {
                const response = await api.raw('GET', getDownloadUrl(file));
                if (!response.ok) throw new Error('Failed to load file');

                const text = await response.text();

                if (text.trim() === '') {
                    setFileContent('');
                    setIsEmpty(true);
                } else {
                    setFileContent(text);
                    setIsEmpty(false);
                }

                setIsLoading(false);
            } catch (error) {

                setFileError(true);
                setIsLoading(false);
            }
        } else if (fileType === 'video') {
            setIsLoading(false);
        } else {
            setIsLoading(false);
        }
    };

    const getPrismLanguage = (filename) => {
        if (!filename) return 'text';

        const ext = filename.split('.').pop()?.toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'jsx',
            'ts': 'typescript',
            'tsx': 'tsx',
            'html': 'markup',
            'htm': 'markup',
            'css': 'css',
            'scss': 'scss',
            'sass': 'scss',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'h': 'c',
            'hpp': 'cpp',
            'cs': 'csharp',
            'php': 'text',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'sql': 'sql',
            'sh': 'bash',
            'bash': 'bash',
            'ps1': 'powershell',
            'yml': 'yaml',
            'yaml': 'yaml',
            'json': 'json',
            'xml': 'markup',
            'md': 'markdown',
            'markdown': 'markdown',
            'toml': 'ini',
            'ini': 'ini',
            'cfg': 'ini',
            'txt': 'text',
            'log': 'text',
            'lua': 'lua',
            'perl': 'perl',
            'pl': 'perl'
        };

        const language = languageMap[ext] || 'text';
        if (language !== 'text' && !Prism.languages[language]) {

            return 'text';
        }

        return language;
    };

    const handleFileLoad = () => {
        setIsLoading(false);
        setFileError(false);
    };

    const handleFileError = (e) => {

        setIsLoading(false);
        setFileError(true);
        setIsVideoPlaying(false);
        setVideoCurrentTime(0);
        setVideoDuration(0);
    };

    const handleVideoError = (e) => {

        setIsLoading(false);
        setFileError(true);
        setIsVideoPlaying(false);
        setVideoCurrentTime(0);
        setVideoDuration(0);
    };

    const updateImageTransform = useCallback((scale, position) => {
        if (contentRef.current) {
            contentRef.current.style.transform = `scale(${scale}) translate3d(${position.x / scale}px, ${position.y / scale}px, 0px)`;
        }
    }, []);

    const handleZoomIn = useCallback(() => {
        setImageScale(prev => {
            const newScale = Math.min(prev * 1.05, 10);
            updateImageTransform(newScale, imagePositionRef.current);
            return newScale;
        });
    }, [updateImageTransform]);

    const handleZoomOut = useCallback(() => {
        setImageScale(prev => {
            const newScale = Math.max(prev / 1.05, 0.1);
            updateImageTransform(newScale, imagePositionRef.current);
            return newScale;
        });
    }, [updateImageTransform]);

    const resetZoom = useCallback(() => {
        setImageScale(1);
        setImagePosition({ x: 0, y: 0 });
        imagePositionRef.current = { x: 0, y: 0 };
        if (contentRef.current) {
            contentRef.current.style.transform = `scale(1) translate3d(0px, 0px, 0px)`;
        }
    }, []);

    const handleMouseDown = useCallback((e) => {
        if (imageScale > 1 && getFileType(currentFile?.name) === 'image') {
            setIsDragging(true);
            isDraggingRef.current = true;
            const newDragStart = {
                x: e.clientX - imagePositionRef.current.x,
                y: e.clientY - imagePositionRef.current.y
            };
            setDragStart(newDragStart);
            dragStartRef.current = newDragStart;
            e.preventDefault();
            if (contentRef.current) {
                contentRef.current.style.cursor = 'grabbing';
            }
        }
    }, [imageScale, currentFile]);

    const handleMouseMove = useCallback((e) => {
        if (isDraggingRef.current && imageScale > 1) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            animationFrameRef.current = requestAnimationFrame(() => {
                const newPosition = {
                    x: e.clientX - dragStartRef.current.x,
                    y: e.clientY - dragStartRef.current.y
                };

                imagePositionRef.current = newPosition;
                setImagePosition(newPosition);
                updateImageTransform(imageScale, newPosition);
            });
        }
    }, [imageScale, updateImageTransform]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        isDraggingRef.current = false;
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (contentRef.current) {
            contentRef.current.style.cursor = imageScale > 1 ? 'grab' : 'default';
        }
    }, [imageScale]);

    const handleDownload = () => {
        if (currentFile) downloadFile(currentFile.path, currentFile.name);
    };

    const handleAction = (action) => {
        onAction(action, currentFile);
        setShowDropdown(false);
    };

    const isEditableFile = (filename) => {
        if (!filename) return false;
        const ext = filename.split('.').pop()?.toLowerCase();
        const editableExtensions = [
            'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'sass',
            'py', 'java', 'c', 'cpp', 'h', 'cs', 'php', 'rb', 'go', 'rs',
            'swift', 'sql', 'sh', 'bash', 'ps1', 'yml', 'yaml', 'json', 'xml',
            'md', 'markdown', 'txt', 'toml', 'ini', 'cfg'
        ];
        return editableExtensions.includes(ext);
    };

    const isHtmlFile = (filename) => {
        if (!filename) return false;
        const ext = filename.split('.').pop()?.toLowerCase();
        return ext === 'html' || ext === 'htm';
    };

    const openCodeEditor = () => {
        if (isEditableFile(currentFile?.name)) {
            setShowCodeEditor(true);
        }
    };

    const handleCodeEditorSave = (newContent) => {
        setFileContent(newContent);
        onAction?.('content-updated', { file: currentFile, content: newContent });
    };

    const renderFileContent = () => {
        if (!currentFile) return null;

        const fileType = getFileType(currentFile.name);
        if (isFileTooBig(currentFile)) {
            const formatFileSize = (bytes) => {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
            };

            return (
                <div className={style.error}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z" fill="currentColor" />
                    </svg>
                    <p>File too large for preview</p>
                    <p className={style.fileSize}>{formatFileSize(currentFile.size)} - This file is too large to preview in the browser</p>
                    <button onClick={handleDownload} className={style.downloadButton}>
                        Download to view
                    </button>
                </div>
            );
        }

        if (fileError) {
            return (
                <div className={style.error}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor" />
                    </svg>
                    <p>Failed to load file</p>
                </div>
            );
        }

        if (isEmpty) {
            return (
                <div className={style.error}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M13 3L3 13v8h8l10-10L13 3zm2.83 6.83l-1.41 1.41L12 9.83l-2.42 2.42-1.41-1.41L10.59 8.42 8.17 6l1.41-1.41L12 7.01l2.42-2.42L15.83 6l-2.42 2.42L15.83 8.42z" fill="currentColor" />
                    </svg>
                    <p>This file is empty</p>
                </div>
            );
        }

        switch (fileType) {
            case 'image':
                return (
                    <div
                        className={style.contentContainer}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <img
                            ref={contentRef}
                            src={getStreamUrl(currentFile)}
                            alt={currentFile.name}
                            className={`${style.image} ${autoFitImage ? style.autoFitImage : ''}`}
                            style={{
                                willChange: imageScale > 1 ? 'transform' : 'auto',
                                cursor: imageScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                            }}
                            onLoad={(e) => {
                                const img = e.currentTarget;
                                const vw = window.innerWidth;
                                const vh = window.innerHeight;
                                const tooWide = img.naturalWidth > vw * 0.95;
                                const tooTall = img.naturalHeight > vh * 0.95;
                                setAutoFitImage(tooWide || tooTall);
                                handleFileLoad();
                            }}
                            onError={handleFileError}
                            draggable={false}
                        />
                    </div>
                );

            case 'video':
                return (
                    <>
                        <div className={style.contentContainer}>
                            <video
                                ref={videoRef}
                                className={`${style.video} ${isVideoVertical ? style.videoVertical : ''}`}
                                loop
                                preload="metadata"
                                onError={handleVideoError}
                                onTimeUpdate={handleVideoTimeUpdate}
                                onLoadedMetadata={handleVideoLoadedMetadata}
                                onPlay={() => setIsVideoPlaying(true)}
                                onPause={() => setIsVideoPlaying(false)}
                                onLoadStart={() => {

                                }}
                                onClick={handleVideoClick}
                            >
                                <source
                                    src={getStreamUrl(currentFile)}
                                    type={getVideoMimeType(currentFile.name)}
                                />
                                Your browser does not support the video tag.
                            </video>
                        </div>

                        {}
                        {getFileType(currentFile.name) === 'video' && showControls && (
                            <div
                                className={`${style.customVideoControls} ${isVideoVertical ? style.customVideoControlsVertical : ''}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className={style.videoProgressContainer}>
                                    <div className={style.videoTimeDisplay}>
                                        {formatTime(videoCurrentTime)}
                                    </div>
                                    <div
                                        ref={progressBarRef}
                                        className={style.videoProgressBar}
                                        onMouseDown={handleProgressBarMouseDown}
                                        onClick={handleProgressBarClick}
                                    >
                                        <div
                                            className={style.videoProgressFill}
                                            style={{ width: `${videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <div className={style.videoTimeAndControls}>
                                        <div className={style.videoTimeDisplay}>
                                            {formatTime(videoDuration)}
                                        </div>
                                        {isMobile && (
                                            <button
                                                className={style.videoOrientationButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleVideoOrientation();
                                                }}
                                                title="Toggle orientation"
                                            >
                                                <RotateCw size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className={style.videoControlButtons}>
                                    <button
                                        className={style.videoControlButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleVideoMute();
                                        }}
                                        title={isVideoMuted ? "Unmute" : "Mute"}
                                    >
                                        {isVideoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                    </button>

                                    <div className={style.videoControlCenter}>
                                        <button
                                            className={style.videoControlButton}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                seekVideo(10);
                                            }}
                                            title="+10s"
                                        >
                                            10s <Redo2 size={14} strokeWidth={3} />
                                        </button>

                                        <button
                                            className={style.videoControlButton}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                restartVideo();
                                            }}
                                            title="Restart"
                                            style={{ rotate: '180deg' }}
                                        >
                                            <FastForward fill='currentColor' size={14} strokeWidth={2} />
                                        </button>

                                        <button
                                            className={style.videoControlButton}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleVideoPlay();
                                            }}
                                            title={isVideoPlaying ? "Pause" : "Play"}
                                        >
                                            {isVideoPlaying ? <Pause fill='currentColor' size={14} strokeWidth={2} /> : <Play fill='currentColor' size={13} strokeWidth={4} />}
                                        </button>

                                        <button
                                            className={style.videoControlButton}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                goToNextVideo();
                                            }}
                                            title="Next video"
                                        >
                                            <FastForward fill='currentColor' size={14} strokeWidth={2} />
                                        </button>

                                        <button
                                            className={style.videoControlButton}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                seekVideo(-10);
                                            }}
                                            title="-10s"
                                        >
                                            <Undo2 size={14} strokeWidth={3} /> 10s
                                        </button>
                                    </div>

                                    <button
                                        className={style.videoControlButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleVideoFullscreen();
                                        }}
                                        title={isVideoFullscreen ? "Exit fullscreen" : "Fullscreen"}
                                    >
                                        <Maximize size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                );

            case 'text':
            case 'code':
                if (isHtmlFile(currentFile?.name) && isHtmlPreview) {
                    return (
                        <div className={style.contentContainer}>
                            <div className={style.htmlPreviewContainer}>
                                <iframe
                                    srcDoc={fileContent}
                                    className={style.htmlPreview}
                                    sandbox="allow-same-origin allow-scripts allow-forms"
                                    title="HTML Preview"
                                />
                            </div>
                        </div>
                    );
                }

                const language = getPrismLanguage(currentFile.name);
                let highlightedCode = fileContent;
                try {
                    if (language !== 'text' && Prism.languages[language]) {
                        const grammar = Prism.languages[language];
                        if (grammar && typeof grammar === 'object') {
                            highlightedCode = Prism.highlight(
                                fileContent,
                                grammar,
                                language
                            );
                        } else {
                            throw new Error(`Invalid grammar for language: ${language}`);
                        }
                    } else {
                        highlightedCode = fileContent
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#39;');
                    }
                } catch (error) {

                    highlightedCode = fileContent
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
                }

                return (
                    <div className={style.contentContainer}>
                        <div className={style.textContainer}>
                            <pre className={`${style.textContent} language-${language}`}>
                                <code
                                    className={`language-${language}`}
                                    style={{
                                        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Monaco, Consolas, "Courier New", monospace',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                        tabSize: 4
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: highlightedCode
                                    }}
                                />
                            </pre>
                        </div>
                    </div>
                );

            case 'pdf':
                return (
                    <div className={style.contentContainer}>
                        <iframe
                            ref={contentRef}
                            src={getStreamUrl(currentFile)}
                            className={style.iframe}
                            onLoad={handleFileLoad}
                            onError={handleFileError}
                        />
                    </div>
                );

            default:
                return (
                    <div className={style.error}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" fill="currentColor" />
                        </svg>
                        <p>File type not supported for preview</p>
                        <button onClick={handleDownload} className={style.downloadButton}>
                            Download to view
                        </button>
                    </div>
                );
        }
    };

    if (!isOpen || !currentFile) return null;

    const fileType = getFileType(currentFile.name);
    const supportsZoom = fileType === 'image';

    return (
        <>
            {}
            <div className={`${style.overlay} ${mobile ? style.mobileOverlay : ''}`} style={{ display: showCodeEditor ? 'none' : 'flex' }}>
                <div className={`${style.container} ${!mobile && showFileInfoModal ? style.containerWithPanelSpace : ''} ${mobile ? style.mobileContainer : ''}`} ref={containerRef}>
                    {}
                    <div className={style.mainContentArea}>
                        {}
                        {showControls && (
                            <div className={`${style.header} ${mobile ? style.mobileHeader : ''}`}>
                                {mobile ? (
                                    <>
                                        <button
                                            className={style.mobileBackButton}
                                            onClick={onClose}
                                            title="Back"
                                        >
                                            <ArrowLeft size={24} />
                                        </button>

                                        <div className={style.mobileActions}>
                                            <button
                                                className={style.mobileActionButton}
                                                onClick={() => handleAction('favorite')}
                                                title="Favorite"
                                            >
                                                <Star size={20} fill={currentFile.isFavorited ? "currentColor" : "none"} />
                                            </button>

                                            <div className={style.dropdown} ref={dropdownRef}>
                                                <button
                                                    className={style.mobileActionButton}
                                                    onClick={() => setShowDropdown(!showDropdown)}
                                                    title="More options"
                                                >
                                                    <MoreVertical size={20} />
                                                </button>

                                                {showDropdown && (
                                                    <div className={`${style.dropdownMenu} ${style.mobileDropdownMenu}`}>
                                                        <button
                                                            className={style.dropdownItem}
                                                            onClick={handleDownload}
                                                        >
                                                            Download
                                                        </button>

                                                        <button
                                                            className={style.dropdownItem}
                                                            onClick={handleFileInfo}
                                                        >
                                                            File Info
                                                        </button>

                                                        {getFileType(currentFile.name) === 'image' && (
                                                            <button
                                                                className={style.dropdownItem}
                                                                onClick={() => {
                                                                    const printWindow = window.open('', '_blank');
                                                                    const imageUrl = getDownloadUrl(currentFile);
                                                                    printWindow.document.write(`
                                                                <html>
                                                                    <head><title>Print ${currentFile.name}</title></head>
                                                                    <body style="margin: 0; text-align: center;">
                                                                        <img src="${imageUrl}" style="max-width: 100%; height: auto;" onload="window.print(); window.close();" />
                                                                    </body>
                                                                </html>
                                                            `);
                                                                }}
                                                            >
                                                                Print
                                                            </button>
                                                        )}

                                                        <button
                                                            className={style.dropdownItem}
                                                            onClick={handleDeleteConfirm}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className={style.fileInfo}>
                                            <h3 className={style.fileName}>{currentFile.name}</h3>
                                            <span className={style.fileCounter}>
                                                {currentFileIndex + 1} of {files.length}
                                            </span>
                                        </div>

                                        <div className={style.headerControls}>
                                            {isEditableFile(currentFile?.name) && (
                                                <button
                                                    className={style.editButton}
                                                    onClick={openCodeEditor}
                                                    title="Edit file"
                                                >
                                                    <Edit size={20} />
                                                </button>
                                            )}

                                            {isHtmlFile(currentFile?.name) && (
                                                <button
                                                    className={`${style.controlButton} ${isHtmlPreview ? style.previewButtonActive : ''}`}
                                                    onClick={() => setIsHtmlPreview(!isHtmlPreview)}
                                                    title={isHtmlPreview ? "Show code" : "Preview HTML"}
                                                >
                                                    {isHtmlPreview ? <FileText size={20} /> : <Eye size={20} />}
                                                </button>
                                            )}

                                            <button
                                                className={style.controlButton}
                                                onClick={handleDownload}
                                                title="Download"
                                            >
                                                <Download size={20} />
                                            </button>

                                            <div className={style.dropdown} ref={dropdownRef}>
                                                <button
                                                    className={style.controlButton}
                                                    onClick={() => setShowDropdown(!showDropdown)}
                                                    title="More options"
                                                >
                                                    <MoreVertical size={20} />
                                                </button>

                                                {showDropdown && (
                                                    <div className={style.dropdownMenu}>
                                                        {}
                                                        {(currentFile.canRename) && (
                                                            <>
                                                                <button
                                                                    className={style.dropdownItem}
                                                                    onClick={() => handleAction('rename')}
                                                                >
                                                                    Rename
                                                                </button>

                                                                <div className={style.dropdownSeparator}></div>
                                                            </>
                                                        )}

                                                        <button
                                                            className={style.dropdownItem}
                                                            onClick={handleFileInfo}
                                                        >
                                                            Properties
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                className={style.controlButton}
                                                onClick={onClose}
                                                title="Close (Esc)"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {}
                        {!mobile && showControls && currentFileIndex > 0 && (
                            <button
                                className={`${style.navButton} ${style.navLeft}`}
                                onClick={() => onNavigate(currentFileIndex - 1)}
                                title="Previous file"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}

                        {!mobile && showControls && currentFileIndex < files.length - 1 && (
                            <button
                                className={`${style.navButton} ${style.navRight}`}
                                onClick={() => onNavigate(currentFileIndex + 1)}
                                title="Next file"
                            >
                                <ChevronRight size={24} />
                            </button>
                        )}

                        {}
                        <div
                            className={`${style.fileContainer} ${(getFileType(currentFile?.name) === 'image' && imageScale > 1) ? style.zoomActive : ''}`}
                            onClick={toggleControls}
                            onTouchStart={handleFileSwipeStart}
                            onTouchMove={handleFileSwipeMove}
                            onTouchEnd={handleFileSwipeEnd}
                        >
                            {isLoading && (<SoftLoading />)}
                            {!isLoading && renderFileContent()}
                        </div>

                        {}
                        {mobile && showControls && (
                            <>
                                {currentFileIndex > 0 && (
                                    <button
                                        className={`${style.navButton} ${style.navLeft} ${style.mobileNav}`}
                                        onClick={goToPreviousFile}
                                        title="Previous file"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                )}

                                {currentFileIndex < files.length - 1 && (
                                    <button
                                        className={`${style.navButton} ${style.navRight} ${style.mobileNav}`}
                                        onClick={goToNextFile}
                                        title="Next file"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                )}
                            </>
                        )}

                        {}
                        {supportsZoom && !isLoading && !fileError && showControls && (
                            <div className={`${style.zoomControls} ${!mobile && showFileInfoModal ? style.zoomControlsWithSidePanel : ''}`}>
                                <button
                                    className={style.zoomButton}
                                    onClick={handleZoomOut}
                                    title="Zoom out (-)"
                                >
                                    <ZoomOut size={16} />
                                </button>

                                <span className={style.zoomLevel}>
                                    {Math.round(imageScale * 100)}%
                                </span>

                                <button
                                    className={style.zoomButton}
                                    onClick={handleZoomIn}
                                    title="Zoom in (+)"
                                >
                                    <ZoomIn size={16} />
                                </button>

                                <button
                                    className={style.zoomButton}
                                    onClick={resetZoom}
                                    title="Reset zoom (0)"
                                >
                                    <RotateCw size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                {}
            </div>

            {}
            {!mobile && (
                <div ref={sidePanelRef} className={`${style.sidePanel} ${showFileInfoModal ? style.sidePanelOpen : ''}`}>
                    <div className={style.sidePanelHeader}>
                        <h3>File Properties</h3>
                        <button onClick={() => {
                            setShowFileInfoModal(false);
                            setFileInfoMenuSwipePosition(0);
                            setFileInfoMenuInitialY(0);
                            if (lastFocusedElementRef.current && lastFocusedElementRef.current.focus) {
                                lastFocusedElementRef.current.focus();
                            }
                        }}><X /></button>
                    </div>
                    <div className={style.sidePanelContent}>
                        <div className={style.fileInfoItem}>
                            <span>Name:</span>
                            <span>{currentFile.name}</span>
                        </div>
                        <div className={style.fileInfoItem}>
                            <span>Size:</span>
                            <span>{formatFileSize(currentFile.size)}</span>
                        </div>
                        <div className={style.fileInfoItem}>
                            <span>Type:</span>
                            <span>{getFileType(currentFile.name)}</span>
                        </div>
                        {currentFile.name && currentFile.name.includes('.') && (
                            <div className={style.fileInfoItem}>
                                <span>Extension:</span>
                                <span>.{currentFile.name.split('.').pop().toLowerCase()}</span>
                            </div>
                        )}
                        <div className={style.fileInfoItem}>
                            <span>Path:</span>
                            <span>{currentFile.path}</span>
                        </div>
                        {currentFile.modified && (
                            <div className={style.fileInfoItem}>
                                <span>Modified:</span>
                                <span>{formatDate(currentFile.modified)}</span>
                            </div>
                        )}
                        {currentFile.createdAt && (
                            <div className={style.fileInfoItem}>
                                <span>Created:</span>
                                <span>{formatDate(currentFile.createdAt)}</span>
                            </div>
                        )}
                        {currentFile.mime && (
                            <div className={style.fileInfoItem}>
                                <span>MIME Type:</span>
                                <span>{currentFile.mime}</span>
                            </div>
                        )}
                        {hasGPSData(currentFile) && (
                            <div className={style.fileInfoItem}>
                                <span>GPS Location:</span>
                                <span>{formatGPS(fileMetadata?.gps?.latitude, fileMetadata?.gps?.longitude)}</span>
                            </div>
                        )}
                        {fileMetadata?.gps?.altitude && (
                            <div className={style.fileInfoItem}>
                                <span>Altitude:</span>
                                <span>{fileMetadata.gps.altitude.toFixed(2)} m</span>
                            </div>
                        )}
                        {fileMetadata?.camera?.make && (
                            <div className={style.fileInfoItem}>
                                <span>Camera:</span>
                                <span>{fileMetadata.camera.make} {fileMetadata.camera.model || ''}</span>
                            </div>
                        )}
                        {fileMetadata?.camera?.lens && (
                            <div className={style.fileInfoItem}>
                                <span>Lens:</span>
                                <span>{fileMetadata.camera.lens}</span>
                            </div>
                        )}
                        {fileMetadata?.camera?.settings && (
                            <div className={style.fileInfoItem}>
                                <span>Camera Settings:</span>
                                <span>{fileMetadata.camera.settings}</span>
                            </div>
                        )}
                        {fileMetadata?.dateTime && (
                            <div className={style.fileInfoItem}>
                                <span>Date Taken:</span>
                                <span>{formatDate(fileMetadata.dateTime)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {}
            {mobile && showFileInfoModal && (
                <div className={mainStyle.popupModalMenuOverlay} onClick={() => {
                    setShowFileInfoModal(false);
                    setFileInfoMenuSwipePosition(0);
                    setFileInfoMenuInitialY(0);
                }}>
                    <div
                        className={mainStyle.popupModalMenu}
                        style={{
                            transform: `translateY(${fileInfoMenuSwipePosition}%)`
                        }}
                        onTouchStart={handleFileInfoMenuTouchStart}
                        onTouchMove={handleFileInfoMenuTouchMove}
                        onTouchEnd={handleFileInfoMenuTouchEnd}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={mainStyle.popupModalMenuHeader}>
                            <div className={mainStyle.dragHandle}></div>
                            <div>
                                <h3>File Properties</h3>
                                <button onClick={() => {
                                    setShowFileInfoModal(false);
                                    setFileInfoMenuSwipePosition(0);
                                    setFileInfoMenuInitialY(0);
                                }}><X /></button>
                            </div>
                        </div>
                        <div className={mainStyle.popupModalMenuOptions}>
                            {}
                            <div className={style.propertySection}>
                                <h4 className={style.sectionTitle}>General</h4>
                                <div className={style.fileInfoItem}>
                                    <span>Name:</span>
                                    <span>{currentFile.name}</span>
                                </div>
                                <div className={style.fileInfoItem}>
                                    <span>Size:</span>
                                    <span>{formatFileSize(currentFile.size)}</span>
                                </div>
                                <div className={style.fileInfoItem}>
                                    <span>Type:</span>
                                    <span>{getFileType(currentFile.name)}</span>
                                </div>
                                {currentFile.name && currentFile.name.includes('.') && (
                                    <div className={style.fileInfoItem}>
                                        <span>Extension:</span>
                                        <span>.{currentFile.name.split('.').pop().toLowerCase()}</span>
                                    </div>
                                )}
                                <div className={style.fileInfoItem}>
                                    <span>Path:</span>
                                    <span>{currentFile.path}</span>
                                </div>
                            </div>

                            {}
                            <div className={style.propertySection}>
                                <h4 className={style.sectionTitle}>Dates</h4>
                                {currentFile.createdAt && (
                                    <div className={style.fileInfoItem}>
                                        <span>Created:</span>
                                        <span>{formatDate(currentFile.createdAt)}</span>
                                    </div>
                                )}
                                {currentFile.modified && (
                                    <div className={style.fileInfoItem}>
                                        <span>Modified:</span>
                                        <span>{formatDate(currentFile.modified)}</span>
                                    </div>
                                )}
                                {currentFile.accessedAt && (
                                    <div className={style.fileInfoItem}>
                                        <span>Accessed:</span>
                                        <span>{formatDate(currentFile.accessedAt)}</span>
                                    </div>
                                )}
                            </div>

                            {}
                            <div className={style.propertySection}>
                                <h4 className={style.sectionTitle}>Technical Details</h4>
                                {currentFile.mime && (
                                    <div className={style.fileInfoItem}>
                                        <span>MIME Type:</span>
                                        <span>{currentFile.mime}</span>
                                    </div>
                                )}
                                {currentFile.encoding && (
                                    <div className={style.fileInfoItem}>
                                        <span>Encoding:</span>
                                        <span>{currentFile.encoding}</span>
                                    </div>
                                )}
                                {currentFile.permissions && (
                                    <div className={style.fileInfoItem}>
                                        <span>Permissions:</span>
                                        <span>{currentFile.permissions}</span>
                                    </div>
                                )}
                            </div>

                            {}
                            {hasGPSData(currentFile) && (
                                <div className={style.propertySection}>
                                    <h4 className={style.sectionTitle}>Location</h4>
                                    <div className={style.fileInfoItem}>
                                        <span>GPS Coordinates:</span>
                                        <span>{formatGPS(fileMetadata?.gps?.latitude, fileMetadata?.gps?.longitude)}</span>
                                    </div>
                                    {fileMetadata?.gps?.altitude && (
                                        <div className={style.fileInfoItem}>
                                            <span>Altitude:</span>
                                            <span>{fileMetadata.gps.altitude.toFixed(2)} meters</span>
                                        </div>
                                    )}
                                    {fileMetadata?.gps?.location && (
                                        <div className={style.fileInfoItem}>
                                            <span>Location:</span>
                                            <span>{fileMetadata.gps.location}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {}
                            {fileMetadata?.camera && (
                                <div className={style.propertySection}>
                                    <h4 className={style.sectionTitle}>Camera Information</h4>
                                    {fileMetadata.camera.make && (
                                        <div className={style.fileInfoItem}>
                                            <span>Camera Make:</span>
                                            <span>{fileMetadata.camera.make}</span>
                                        </div>
                                    )}
                                    {fileMetadata.camera.model && (
                                        <div className={style.fileInfoItem}>
                                            <span>Camera Model:</span>
                                            <span>{fileMetadata.camera.model}</span>
                                        </div>
                                    )}
                                    {fileMetadata?.dateTime && (
                                        <div className={style.fileInfoItem}>
                                            <span>Date Taken:</span>
                                            <span>{formatDate(fileMetadata.dateTime)}</span>
                                        </div>
                                    )}
                                    {fileMetadata.camera.lens && (
                                        <div className={style.fileInfoItem}>
                                            <span>Lens:</span>
                                            <span>{fileMetadata.camera.lens}</span>
                                        </div>
                                    )}
                                    {fileMetadata.camera.settings && (
                                        <div className={style.fileInfoItem}>
                                            <span>Camera Settings:</span>
                                            <span>{fileMetadata.camera.settings}</span>
                                        </div>
                                    )}
                                    {fileMetadata.camera.software && (
                                        <div className={style.fileInfoItem}>
                                            <span>Software:</span>
                                            <span>{fileMetadata.camera.software}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {}
                            {fileMetadata && (fileMetadata.image || fileMetadata.settings) && (
                                <div className={style.propertySection}>
                                    <h4 className={style.sectionTitle}>Image Details</h4>
                                    {fileMetadata.image?.width && fileMetadata.image?.height && (
                                        <div className={style.fileInfoItem}>
                                            <span>Dimensions:</span>
                                            <span>{fileMetadata.image.width} × {fileMetadata.image.height} pixels</span>
                                        </div>
                                    )}
                                    {fileMetadata.settings?.iso && (
                                        <div className={style.fileInfoItem}>
                                            <span>ISO:</span>
                                            <span>{fileMetadata.settings.iso}</span>
                                        </div>
                                    )}
                                    {fileMetadata.settings?.aperture && (
                                        <div className={style.fileInfoItem}>
                                            <span>Aperture:</span>
                                            <span>f/{fileMetadata.settings.aperture}</span>
                                        </div>
                                    )}
                                    {fileMetadata.settings?.shutterSpeed && (
                                        <div className={style.fileInfoItem}>
                                            <span>Shutter Speed:</span>
                                            <span>{fileMetadata.settings.shutterSpeed}</span>
                                        </div>
                                    )}
                                    {fileMetadata.settings?.flash && (
                                        <div className={style.fileInfoItem}>
                                            <span>Flash:</span>
                                            <span>{fileMetadata.settings.flash}</span>
                                        </div>
                                    )}
                                    {fileMetadata.settings?.whiteBalance && (
                                        <div className={style.fileInfoItem}>
                                            <span>White Balance:</span>
                                            <span>{fileMetadata.settings.whiteBalance}</span>
                                        </div>
                                    )}
                                    {fileMetadata.image?.orientation && (
                                        <div className={style.fileInfoItem}>
                                            <span>Orientation:</span>
                                            <span>{fileMetadata.image.orientation}</span>
                                        </div>
                                    )}
                                    {fileMetadata.image?.colorSpace && (
                                        <div className={style.fileInfoItem}>
                                            <span>Color Space:</span>
                                            <span>{fileMetadata.image.colorSpace}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {}
                            {fileMetadata?.device && (
                                <div className={style.propertySection}>
                                    <h4 className={style.sectionTitle}>Device Information</h4>
                                    {fileMetadata.device.manufacturer && (
                                        <div className={style.fileInfoItem}>
                                            <span>Manufacturer:</span>
                                            <span>{fileMetadata.device.manufacturer}</span>
                                        </div>
                                    )}
                                    {fileMetadata.device.model && (
                                        <div className={style.fileInfoItem}>
                                            <span>Device Model:</span>
                                            <span>{fileMetadata.device.model}</span>
                                        </div>
                                    )}
                                    {fileMetadata.device.osVersion && (
                                        <div className={style.fileInfoItem}>
                                            <span>OS Version:</span>
                                            <span>{fileMetadata.device.osVersion}</span>
                                        </div>
                                    )}
                                    {fileMetadata.device.appVersion && (
                                        <div className={style.fileInfoItem}>
                                            <span>App Version:</span>
                                            <span>{fileMetadata.device.appVersion}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {}
            {showDeleteModal && (
                <div className={mainStyle.popupModalMenuOverlay} onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteMenuSwipePosition(0);
                    setDeleteMenuInitialY(0);
                }}>
                    <div
                        className={mainStyle.popupModalMenu}
                        style={{
                            transform: `translateY(${deleteMenuSwipePosition}%)`
                        }}
                        onTouchStart={handleDeleteMenuTouchStart}
                        onTouchMove={handleDeleteMenuTouchMove}
                        onTouchEnd={handleDeleteMenuTouchEnd}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={mainStyle.popupModalMenuHeader}>
                            <div className={mainStyle.dragHandle}></div>
                            <div>
                                <h3>Delete File</h3>
                                <button onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteMenuSwipePosition(0);
                                    setDeleteMenuInitialY(0);
                                }}><X /></button>
                            </div>
                        </div>
                        <div className={mainStyle.popupModalMenuOptions}>
                            <div style={{ padding: '0 20px' }}>
                                <p style={{ margin: '16px 0 8px 0', fontSize: '16px', textAlign: 'center' }}>Are you sure you want to delete "{currentFile.name}"?</p>
                                <p className={style.deleteWarning}>This action cannot be undone.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', padding: '16px 20px' }}>
                                <button
                                    className={style.modalCancelButton}
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeleteMenuSwipePosition(0);
                                        setDeleteMenuInitialY(0);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={style.modalDeleteButton}
                                    onClick={confirmDelete}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {}
            {showCodeEditor && isEditableFile(currentFile?.name) && (
                <CodeEditor
                    file={currentFile}
                    content={fileContent}
                    onSave={handleCodeEditorSave}
                    onClose={() => setShowCodeEditor(false)}
                />
            )}
        </>
    );
}

const getVideoMimeType = (filename) => {
    if (!filename) return 'video/mp4';

    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'mkv': 'video/x-matroska',
        'm4v': 'video/mp4',
        'flv': 'video/x-flv'
    };

    return mimeTypes[ext] || 'video/mp4';
};
