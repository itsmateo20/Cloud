// components/app/FileViewer.js

import style from './FileViewer.module.css';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import SoftLoading from '@/components/SoftLoading';
import { CodeEditor } from './CodeEditor';
import { downloadFile } from '@/utils/downloadUtils';
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

export function FileViewer({
    isOpen,
    currentFileIndex,
    files,
    onClose,
    onNavigate,
    onAction
}) {
    const [isLoading, setIsLoading] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);
    const [fileError, setFileError] = useState(false);
    const [fileContent, setFileContent] = useState('');
    const [imageScale, setImageScale] = useState(1);
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showCodeEditor, setShowCodeEditor] = useState(false);
    const imagePositionRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef(null);

    const contentRef = useRef(null);
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);

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
            console.log(e.key)
            switch (e.key) {
                case 'Escape':
                    onClose();
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
            }
        };
        const handleWheel = (e) => {
            if (getFileType(currentFile?.name) === 'image') {
                e.preventDefault();
                if (e.deltaY < 0) {
                    handleZoomIn();
                } else {
                    handleZoomOut();
                }
            }
        };

        if (containerRef.current) {
            containerRef.current.addEventListener('wheel', handleWheel, { passive: false });
        }

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
    }, [isOpen, currentFileIndex, files.length, onClose, onNavigate]);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setFileError(false);
            setFileContent('');
            resetZoom();

            if (currentFile) {
                loadFileContent(currentFile);
            }
        }
    }, [currentFileIndex, isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
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
            image: 50 * 1024 * 1024,      // 50MB for images
            video: 500 * 1024 * 1024,     // 500MB for videos  
            text: 10 * 1024 * 1024,       // 10MB for text files
            code: 10 * 1024 * 1024,       // 10MB for code files
            pdf: 100 * 1024 * 1024,       // 100MB for PDFs
            unknown: 0                     // No preview for unknown types
        };

        return size > (limits[fileType] || 0);
    };

    const loadFileContent = async (file) => {
        const fileType = getFileType(file.name);

        if (['text', 'code'].includes(fileType)) {
            try {
                const response = await fetch(getDownloadUrl(file));
                if (!response.ok) throw new Error('Failed to load file');

                const text = await response.text();
                setFileContent(text);

                setIsLoading(false);
            } catch (error) {
                console.error('Error loading text file:', error);
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
            'php': 'text', // Fallback to text for PHP due to dependency issues
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
            console.warn(`Language '${language}' not available, falling back to text`);
            return 'text';
        }

        return language;
    };

    const handleFileLoad = () => {
        setIsLoading(false);
        setFileError(false);
    };

    const handleFileError = (e) => {
        console.error('File loading error:', e);
        setIsLoading(false);
        setFileError(true);
    };

    const handleVideoLoad = () => {
        console.log('Video loaded successfully');
        setIsLoading(false);
        setFileError(false);
    };

    const handleVideoError = (e) => {
        console.error('Video loading error:', e.target?.error || 'Unknown video error');
        console.error('Video src:', e.target?.src || 'No source');
        console.error('Video file size:', currentFile?.size ? `${(currentFile.size / (1024 * 1024)).toFixed(1)}MB` : 'Unknown size');
        setIsLoading(false);
        setFileError(true);
    };

    const updateImageTransform = useCallback((scale, position) => {
        if (contentRef.current) {
            contentRef.current.style.transform = `scale(${scale}) translate3d(${position.x / scale}px, ${position.y / scale}px, 0px)`;
        }
    }, []);

    const handleZoomIn = useCallback(() => {
        setImageScale(prev => {
            const newScale = Math.min(prev * 1.2, 5);
            updateImageTransform(newScale, imagePositionRef.current);
            return newScale;
        });
    }, [updateImageTransform]);

    const handleZoomOut = useCallback(() => {
        setImageScale(prev => {
            const newScale = Math.max(prev / 1.2, 0.1);
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

    const getLanguageFromExtension = (filename) => {
        if (!filename) return 'text';

        const ext = filename.split('.').pop()?.toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'jsx',
            'ts': 'typescript',
            'tsx': 'tsx',
            'html': 'html',
            'htm': 'htm',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'h': 'h',
            'hpp': 'hpp',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'sql': 'sql',
            'sh': 'shell',
            'bash': 'bash',
            'ps1': 'powershell',
            'yml': 'yaml',
            'yaml': 'yaml',
            'json': 'json',
            'xml': 'xml',
            'md': 'markdown',
            'markdown': 'markdown',
            'toml': 'toml',
            'ini': 'ini',
            'cfg': 'cfg',
            'txt': 'text',
            'log': 'log',
            'dockerfile': 'dockerfile',
            'lua': 'lua',
            'perl': 'perl',
            'pl': 'perl',
            'vim': 'vim'
        };

        return languageMap[ext] || 'text';
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

    const openCodeEditor = () => {
        if (isEditableFile(currentFile?.name)) {
            setShowCodeEditor(true);
        }
    };

    const handleCodeEditorSave = (newContent) => {
        setFileContent(newContent);
        onAction?.('refresh', currentFile);
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
                            className={style.image}
                            style={{
                                willChange: imageScale > 1 ? 'transform' : 'auto',
                                cursor: imageScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                            }}
                            onLoad={handleFileLoad}
                            onError={handleFileError}
                            draggable={false}
                        />
                    </div>
                );

            case 'video':
                return (
                    <div className={style.contentContainer}>
                        <video
                            ref={contentRef}
                            className={style.video}
                            controls
                            loop
                            preload="metadata"
                            onError={handleVideoError}
                            onLoadStart={() => {
                                console.log('Video load started for:', currentFile.name, 'Size:', currentFile.size ? `${(currentFile.size / (1024 * 1024)).toFixed(1)}MB` : 'Unknown');
                            }}
                        >
                            <source
                                src={getStreamUrl(currentFile)}
                                type={getVideoMimeType(currentFile.name)}
                            />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );

            case 'text':
            case 'code':
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
                    console.warn(`Failed to highlight ${language} code:`, error);
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
            {/* Main FileViewer */}
            <div className={style.overlay} style={{ display: showCodeEditor ? 'none' : 'flex' }}>
                <div className={style.container} ref={containerRef}>
                    {/* Header */}
                    <div className={style.header}>
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
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" fill="none" />
                                        <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" fill="none" />
                                    </svg>
                                </button>
                            )}

                            <button
                                className={style.controlButton}
                                onClick={handleDownload}
                                title="Download"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 16L7 11h3V3h4v8h3l-5 5z" fill="currentColor" />
                                    <path d="M20 18H4v-7H2v9h20v-9h-2v7z" fill="currentColor" />
                                </svg>
                            </button>

                            <div className={style.dropdown} ref={dropdownRef}>
                                <button
                                    className={style.controlButton}
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    title="More options"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                                        <circle cx="12" cy="5" r="2" fill="currentColor" />
                                        <circle cx="12" cy="19" r="2" fill="currentColor" />
                                    </svg>
                                </button>

                                {showDropdown && (
                                    <div className={style.dropdownMenu}>
                                        {/* Only show rename if user owns the file or has rename permission */}
                                        {(currentFile.canRename) && (
                                            <button
                                                className={style.dropdownItem}
                                                onClick={() => handleAction('rename')}
                                            >
                                                <span className={style.dropdownIcon}>✏️</span>
                                                Rename
                                            </button>
                                        )}

                                        <div className={style.dropdownSeparator}></div>

                                        <button
                                            className={style.dropdownItem}
                                            onClick={() => handleAction('properties')}
                                        >
                                            <span className={style.dropdownIcon}>ℹ️</span>
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
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Navigation */}
                    {currentFileIndex > 0 && (
                        <button
                            className={`${style.navButton} ${style.navLeft}`}
                            onClick={() => onNavigate(currentFileIndex - 1)}
                            title="Previous file"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M15 18L9 12l6-6" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </button>
                    )}

                    {currentFileIndex < files.length - 1 && (
                        <button
                            className={`${style.navButton} ${style.navRight}`}
                            onClick={() => onNavigate(currentFileIndex + 1)}
                            title="Next file"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </button>
                    )}

                    {/* Content Container */}
                    <div className={style.fileContainer}>
                        {isLoading && (<SoftLoading />)}
                        {!isLoading && renderFileContent()}
                    </div>

                    {/* Zoom Controls - Only for images */}
                    {supportsZoom && !isLoading && !fileError && (
                        <div className={style.zoomControls}>
                            <button
                                className={style.zoomButton}
                                onClick={handleZoomOut}
                                title="Zoom out (-)"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M19 13H5v-2h14v2z" fill="currentColor" />
                                </svg>
                            </button>

                            <span className={style.zoomLevel}>
                                {Math.round(imageScale * 100)}%
                            </span>

                            <button
                                className={style.zoomButton}
                                onClick={handleZoomIn}
                                title="Zoom in (+)"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
                                </svg>
                            </button>

                            <button
                                className={style.zoomButton}
                                onClick={resetZoom}
                                title="Reset zoom (0)"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" />
                                    <path d="M8 12h8v-2H8v2z" fill="currentColor" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Code Editor */}
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
