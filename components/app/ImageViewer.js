// components/app/ImageViewer.js

import { useState, useEffect, useRef } from 'react';
import styles from './ImageViewer.module.css';
import SoftLoading from '../SoftLoading';

export function ImageViewer({
    isOpen,
    currentImageIndex,
    images,
    onClose,
    onNavigate,
    onAction
}) {
    const [isLoading, setIsLoading] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [imageScale, setImageScale] = useState(1);
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const imageRef = useRef(null);
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);

    const currentImage = images[currentImageIndex];

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                case '<':
                case ',':
                    if (currentImageIndex > 0) {
                        onNavigate(currentImageIndex - 1);
                    }
                    break;
                case 'ArrowRight':
                case '>':
                case '.':
                    if (currentImageIndex < images.length - 1) {
                        onNavigate(currentImageIndex + 1);
                    }
                    break;
                case '+':
                case '=':
                    handleZoomIn();
                    break;
                case '-':
                case '_':
                    handleZoomOut();
                    break;
                case '0':
                    resetZoom();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, currentImageIndex, images.length, onClose, onNavigate]);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setImageError(false);
            resetZoom();
        }
    }, [currentImageIndex, isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleImageLoad = () => {
        setIsLoading(false);
        setImageError(false);
    };

    const handleImageError = () => {
        setIsLoading(false);
        setImageError(true);
    };

    const handleZoomIn = () => {
        setImageScale(prev => Math.min(prev * 1.2, 5));
    };

    const handleZoomOut = () => {
        setImageScale(prev => Math.max(prev / 1.2, 0.1));
    };

    const resetZoom = () => {
        setImageScale(1);
        setImagePosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e) => {
        if (imageScale > 1) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - imagePosition.x,
                y: e.clientY - imagePosition.y
            });
            e.preventDefault();
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging && imageScale > 1) {
            setImagePosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleDownload = () => {
        if (currentImage) {
            const link = document.createElement('a');
            link.href = `/api/files/download?path=${encodeURIComponent(currentImage.path)}`;
            link.download = currentImage.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleAction = (action) => {
        onAction(action, currentImage);
        setShowDropdown(false);
    };

    if (!isOpen || !currentImage) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.container} ref={containerRef}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.imageInfo}>
                        <h3 className={styles.imageName}>{currentImage.name}</h3>
                        <span className={styles.imageCounter}>
                            {currentImageIndex + 1} of {images.length}
                        </span>
                    </div>

                    <div className={styles.headerControls}>
                        <button
                            className={styles.controlButton}
                            onClick={handleDownload}
                            title="Download"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M12 16L7 11h3V3h4v8h3l-5 5z" fill="currentColor" />
                                <path d="M20 18H4v-7H2v9h20v-9h-2v7z" fill="currentColor" />
                            </svg>
                        </button>

                        <div className={styles.dropdown} ref={dropdownRef}>
                            <button
                                className={styles.controlButton}
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
                                <div className={styles.dropdownMenu}>
                                    <button
                                        className={styles.dropdownItem}
                                        onClick={() => handleAction('rename')}
                                    >
                                        <span className={styles.dropdownIcon}>✏️</span>
                                        Rename
                                    </button>
                                    <button
                                        className={styles.dropdownItem}
                                        onClick={() => handleAction('share')}
                                    >
                                        <span className={styles.dropdownIcon}>🔗</span>
                                        Share
                                    </button>
                                    <button
                                        className={styles.dropdownItem}
                                        onClick={() => handleAction('favorite')}
                                    >
                                        <span className={styles.dropdownIcon}>⭐</span>
                                        Add to Favorites
                                    </button>
                                    <div className={styles.dropdownSeparator}></div>
                                    <button
                                        className={styles.dropdownItem}
                                        onClick={() => handleAction('properties')}
                                    >
                                        <span className={styles.dropdownIcon}>ℹ️</span>
                                        Properties
                                    </button>
                                    <div className={styles.dropdownSeparator}></div>
                                    <button
                                        className={`${styles.dropdownItem} ${styles.danger}`}
                                        onClick={() => handleAction('delete')}
                                    >
                                        <span className={styles.dropdownIcon}>🗑️</span>
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            className={styles.controlButton}
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
                {currentImageIndex > 0 && (
                    <button
                        className={`${styles.navButton} ${styles.navLeft}`}
                        onClick={() => onNavigate(currentImageIndex - 1)}
                        title="Previous image"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M15 18L9 12l6-6" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    </button>
                )}

                {currentImageIndex < images.length - 1 && (
                    <button
                        className={`${styles.navButton} ${styles.navRight}`}
                        onClick={() => onNavigate(currentImageIndex + 1)}
                        title="Next image"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    </button>
                )}

                {/* Image Container */}
                <div
                    className={styles.imageContainer}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {isLoading && (<SoftLoading style={styles} />)}

                    {imageError ? (
                        <div className={styles.error}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor" />
                            </svg>
                            <p>Failed to load image</p>
                        </div>
                    ) : (
                        <img
                            ref={imageRef}
                            src={`/api/files/download?path=${encodeURIComponent(currentImage.path)}`}
                            alt={currentImage.name}
                            className={styles.image}
                            style={{
                                transform: `scale(${imageScale}) translate(${imagePosition.x / imageScale}px, ${imagePosition.y / imageScale}px)`,
                                cursor: imageScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                            }}
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                            draggable={false}
                        />
                    )}
                </div>

                {/* Zoom Controls */}
                <div className={styles.zoomControls}>
                    <button
                        className={styles.zoomButton}
                        onClick={handleZoomOut}
                        title="Zoom out (-)"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M19 13H5v-2h14v2z" fill="currentColor" />
                        </svg>
                    </button>

                    <span className={styles.zoomLevel}>
                        {Math.round(imageScale * 100)}%
                    </span>

                    <button
                        className={styles.zoomButton}
                        onClick={handleZoomIn}
                        title="Zoom in (+)"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
                        </svg>
                    </button>

                    <button
                        className={styles.zoomButton}
                        onClick={resetZoom}
                        title="Reset zoom (0)"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" />
                            <path d="M8 12h8v-2H8v2z" fill="currentColor" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}