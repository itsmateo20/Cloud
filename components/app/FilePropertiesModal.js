"use client";

import React, { useEffect, useCallback, useState } from 'react';
import styles from './FilePropertiesModal.module.css';
import { X, Copy, Star, FileText, Image, Video, Music, Archive } from 'lucide-react';

function formatSize(size) {
    if (size == null) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFileIcon(filename, isDirectory) {
    if (isDirectory) return null;
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (!ext) return <FileText size={16} />;

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return <Image size={16} />;
    if (['mp4', 'avi', 'mov', 'webm', 'mkv', 'wmv', 'flv'].includes(ext)) return <Video size={16} />;
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) return <Music size={16} />;
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return <Archive size={16} />;
    return <FileText size={16} />;
}

function getMimeTypeCategory(filename) {
    if (!filename) return 'Unknown';
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return 'Unknown';

    const categories = {
        image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff'],
        video: ['mp4', 'avi', 'mov', 'webm', 'mkv', 'wmv', 'flv', 'm4v', '3gp'],
        audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'],
        document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'],
        code: ['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'xml', 'py', 'java', 'c', 'cpp'],
        archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
        executable: ['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm']
    };

    for (const [category, extensions] of Object.entries(categories)) {
        if (extensions.includes(ext)) {
            return category.charAt(0).toUpperCase() + category.slice(1);
        }
    }
    return 'Other';
}

export default function FilePropertiesModal({ open, items = [], onClose }) {
    const [visible, setVisible] = useState(open);
    const [closing, setClosing] = useState(false);
    const [metadata, setMetadata] = useState({});

    useEffect(() => {
        if (open) {
            setVisible(true);
            setClosing(false);
        } else if (visible) {
            setClosing(true);
            const t = setTimeout(() => { setVisible(false); setClosing(false); }, 160);
            return () => clearTimeout(t);
        }
    }, [open, visible]);

    // Extract additional metadata for single file or folder
    useEffect(() => {
        if (open && items.length === 1) {
            const item = items[0];
            const newMetadata = {
                extension: (item.isDirectory || item.type === 'folder') ? null : (item.name?.split('.').pop()?.toUpperCase() || 'N/A'),
                category: (item.isDirectory || item.type === 'folder') ? 'Folder' : getMimeTypeCategory(item.name),
                created: item.createdAt || item.created,
                accessed: item.accessedAt || item.accessed,
                encoding: (item.isDirectory || item.type === 'folder') ? null : (item.encoding || 'UTF-8'),
                permissions: item.permissions || '644',
                // Folder-specific metadata
                itemCount: (item.isDirectory || item.type === 'folder') ? item.itemCount : null,
                folderSize: (item.isDirectory || item.type === 'folder') ? item.folderSize : null,
                hasSubfolders: (item.isDirectory || item.type === 'folder') ? item.hasSubfolders : null,
                lastActivity: (item.isDirectory || item.type === 'folder') ? item.lastActivity : null
            };

            // Try to extract EXIF data for images (only for files, not folders)
            if (item.metadata && !(item.isDirectory || item.type === 'folder')) {
                newMetadata.exif = item.metadata;
            }

            setMetadata(newMetadata);
        } else {
            setMetadata({});
        }
    }, [open, items]);

    const escHandler = useCallback((e) => { if ((open || closing) && e.key === 'Escape') onClose?.(); }, [open, closing, onClose]);
    useEffect(() => {
        if (open && visible) {
            document.addEventListener('keydown', escHandler);
            document.body.style.overflow = 'hidden';
            return () => { document.removeEventListener('keydown', escHandler); document.body.style.overflow = ''; };
        }
        if (closing) {
            document.body.style.overflow = 'hidden';
            const t = setTimeout(() => { document.body.style.overflow = ''; }, 160);
            return () => clearTimeout(t);
        }
    }, [open, visible, closing, escHandler]);

    if (!visible || !items.length) return null;

    const first = items[0];
    const multiple = items.length > 1;
    const totalSize = items.reduce((acc, it) => acc + (it.size || 0), 0);
    const distinctTypes = [...new Set(items.map(it => it.type || (it.isDirectory ? 'Folder' : 'File')))].slice(0, 6);

    const copy = (text) => navigator.clipboard?.writeText(text).catch(() => { });

    const dateString = (ts) => {
        if (!ts) return '—';
        const date = new Date(ts);
        return date.toLocaleString() + ` (${date.toLocaleDateString()})`;
    };

    const formatAge = (ts) => {
        if (!ts) return '—';
        const now = new Date();
        const then = new Date(ts);
        const diffMs = now - then;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 30) return `${diffDays} days ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    };

    return (
        <div className={`${styles.backdrop} ${closing ? styles.backdropClosing : ''}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
            <div className={`${styles.modal} ${closing ? styles.modalClosing : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.titleRow}>
                        {!multiple && getFileIcon(first.name, first.isDirectory)}
                        <h3 className={styles.title}>{multiple ? `${items.length} items selected` : first.name}</h3>
                        {!multiple && first.isFavorited && <Star size={16} className={styles.favoriteStar} />}
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
                </div>
                <div className={styles.body}>
                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>General</div>
                        <div className={styles.kv}>
                            <div className={styles.kvLabel}>Name</div>
                            <div className={styles.kvValue}>{multiple ? '— (multiple)' : first.name}</div>
                            {!multiple && <button className={styles.copyBtn} onClick={() => copy(first.name)}><Copy size={14} /></button>}
                        </div>
                        <div className={styles.kv}>
                            <div className={styles.kvLabel}>Type</div>
                            <div className={styles.kvValue}>
                                {multiple ? `${distinctTypes.length} types` : first.type || (first.isDirectory ? 'Folder' : metadata.category || 'File')}
                            </div>
                        </div>
                        {!multiple && !(first.isDirectory || first.type === 'folder') && metadata.extension && (
                            <div className={styles.kv}>
                                <div className={styles.kvLabel}>Extension</div>
                                <div className={styles.kvValue}>.{metadata.extension.toLowerCase()}</div>
                            </div>
                        )}
                        <div className={styles.kv}>
                            <div className={styles.kvLabel}>Location</div>
                            <div className={styles.kvValue}>{multiple ? '— (multiple)' : first.path || '/'}</div>
                            {!multiple && <button className={styles.copyBtn} onClick={() => copy(first.path || '/')}><Copy size={14} /></button>}
                        </div>
                        <div className={styles.kv}>
                            <div className={styles.kvLabel}>Size</div>
                            <div className={styles.kvValue}>
                                {multiple ? formatSize(totalSize) : formatSize(first.size)}
                                {!multiple && first.size && (
                                    <span className={styles.sizeDetails}> ({first.size?.toLocaleString()} bytes)</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>Dates</div>
                        <div className={styles.kv}>
                            <div className={styles.kvLabel}>Created</div>
                            <div className={styles.kvValue}>
                                {multiple ? '— (varies)' : dateString(metadata.created || first.createdAt)}
                                {!multiple && metadata.created && (
                                    <span className={styles.ageInfo}> • {formatAge(metadata.created)}</span>
                                )}
                            </div>
                        </div>
                        <div className={styles.kv}>
                            <div className={styles.kvLabel}>Modified</div>
                            <div className={styles.kvValue}>
                                {multiple ? '— (varies)' : dateString(first.modified || first.modifiedAt || first.updatedAt)}
                                {!multiple && first.modified && (
                                    <span className={styles.ageInfo}> • {formatAge(first.modified)}</span>
                                )}
                            </div>
                        </div>
                        {!multiple && metadata.accessed && (
                            <div className={styles.kv}>
                                <div className={styles.kvLabel}>Accessed</div>
                                <div className={styles.kvValue}>
                                    {dateString(metadata.accessed)}
                                    <span className={styles.ageInfo}> • {formatAge(metadata.accessed)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {!multiple && (first.isDirectory || first.type === 'folder') && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Folder Details</div>
                            {metadata.itemCount != null && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Items</div>
                                    <div className={styles.kvValue}>{metadata.itemCount.toLocaleString()} item{metadata.itemCount !== 1 ? 's' : ''}</div>
                                </div>
                            )}
                            {metadata.hasSubfolders != null && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Contains Subfolders</div>
                                    <div className={styles.kvValue}>{metadata.hasSubfolders ? 'Yes' : 'No'}</div>
                                </div>
                            )}
                            {metadata.folderSize != null && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Total Size</div>
                                    <div className={styles.kvValue}>
                                        {formatSize(metadata.folderSize)}
                                        {metadata.folderSize > 0 && (
                                            <span className={styles.sizeDetails}> ({metadata.folderSize.toLocaleString()} bytes)</span>
                                        )}
                                    </div>
                                </div>
                            )}
                            {metadata.lastActivity && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Last Activity</div>
                                    <div className={styles.kvValue}>
                                        {dateString(metadata.lastActivity)}
                                        <span className={styles.ageInfo}> • {formatAge(metadata.lastActivity)}</span>
                                    </div>
                                </div>
                            )}
                            {metadata.permissions && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Permissions</div>
                                    <div className={styles.kvValue}>{metadata.permissions}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {!multiple && !(first.isDirectory || first.type === 'folder') && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Technical Details</div>
                            {metadata.encoding && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Encoding</div>
                                    <div className={styles.kvValue}>{metadata.encoding}</div>
                                </div>
                            )}
                            {metadata.permissions && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Permissions</div>
                                    <div className={styles.kvValue}>{metadata.permissions}</div>
                                </div>
                            )}
                            {first.mime && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>MIME Type</div>
                                    <div className={styles.kvValue}>{first.mime}</div>
                                    <button className={styles.copyBtn} onClick={() => copy(first.mime)}><Copy size={14} /></button>
                                </div>
                            )}
                        </div>
                    )}

                    {!multiple && metadata.exif && metadata.exif.gps && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Location</div>
                            {metadata.exif.gps.latitude && metadata.exif.gps.longitude && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>GPS Coordinates</div>
                                    <div className={styles.kvValue}>
                                        {metadata.exif.gps.latitude.toFixed(6)}, {metadata.exif.gps.longitude.toFixed(6)}
                                        <button className={styles.copyBtn} onClick={() => copy(`${metadata.exif.gps.latitude}, ${metadata.exif.gps.longitude}`)}><Copy size={14} /></button>
                                    </div>
                                </div>
                            )}
                            {metadata.exif.gps.altitude && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Altitude</div>
                                    <div className={styles.kvValue}>{metadata.exif.gps.altitude.toFixed(2)} meters</div>
                                </div>
                            )}
                            {metadata.exif.gps.location && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Location</div>
                                    <div className={styles.kvValue}>{metadata.exif.gps.location}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {!multiple && metadata.exif && (metadata.exif.camera || metadata.exif.dateTime) && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Camera Information</div>
                            {metadata.exif.camera?.make && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Camera Make</div>
                                    <div className={styles.kvValue}>{metadata.exif.camera.make}</div>
                                </div>
                            )}
                            {metadata.exif.camera?.model && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Camera Model</div>
                                    <div className={styles.kvValue}>{metadata.exif.camera.model}</div>
                                </div>
                            )}
                            {metadata.exif.dateTime && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Date Taken</div>
                                    <div className={styles.kvValue}>{dateString(metadata.exif.dateTime)}</div>
                                </div>
                            )}
                            {metadata.exif.camera?.lens && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Lens</div>
                                    <div className={styles.kvValue}>{metadata.exif.camera.lens}</div>
                                </div>
                            )}
                            {metadata.exif.camera?.settings && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Camera Settings</div>
                                    <div className={styles.kvValue}>{metadata.exif.camera.settings}</div>
                                </div>
                            )}
                            {metadata.exif.camera?.software && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Software</div>
                                    <div className={styles.kvValue}>{metadata.exif.camera.software}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {!multiple && metadata.exif && (metadata.exif.image || metadata.exif.settings) && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Image Details</div>
                            {metadata.exif.image?.width && metadata.exif.image?.height && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Dimensions</div>
                                    <div className={styles.kvValue}>{metadata.exif.image.width} × {metadata.exif.image.height} pixels</div>
                                </div>
                            )}
                            {metadata.exif.settings?.iso && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>ISO</div>
                                    <div className={styles.kvValue}>{metadata.exif.settings.iso}</div>
                                </div>
                            )}
                            {metadata.exif.settings?.aperture && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Aperture</div>
                                    <div className={styles.kvValue}>f/{metadata.exif.settings.aperture}</div>
                                </div>
                            )}
                            {metadata.exif.settings?.shutterSpeed && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Shutter Speed</div>
                                    <div className={styles.kvValue}>{metadata.exif.settings.shutterSpeed}</div>
                                </div>
                            )}
                            {metadata.exif.settings?.flash && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Flash</div>
                                    <div className={styles.kvValue}>{metadata.exif.settings.flash}</div>
                                </div>
                            )}
                            {metadata.exif.settings?.whiteBalance && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>White Balance</div>
                                    <div className={styles.kvValue}>{metadata.exif.settings.whiteBalance}</div>
                                </div>
                            )}
                            {metadata.exif.image?.orientation && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Orientation</div>
                                    <div className={styles.kvValue}>{metadata.exif.image.orientation}</div>
                                </div>
                            )}
                            {metadata.exif.image?.colorSpace && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Color Space</div>
                                    <div className={styles.kvValue}>{metadata.exif.image.colorSpace}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {!multiple && metadata.exif && metadata.exif.device && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Device Information</div>
                            {metadata.exif.device?.manufacturer && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Manufacturer</div>
                                    <div className={styles.kvValue}>{metadata.exif.device.manufacturer}</div>
                                </div>
                            )}
                            {metadata.exif.device?.model && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>Device Model</div>
                                    <div className={styles.kvValue}>{metadata.exif.device.model}</div>
                                </div>
                            )}
                            {metadata.exif.device?.osVersion && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>OS Version</div>
                                    <div className={styles.kvValue}>{metadata.exif.device.osVersion}</div>
                                </div>
                            )}
                            {metadata.exif.device?.appVersion && (
                                <div className={styles.kv}>
                                    <div className={styles.kvLabel}>App Version</div>
                                    <div className={styles.kvValue}>{metadata.exif.device.appVersion}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {multiple && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Selection Summary</div>
                            <div className={styles.kv}>
                                <div className={styles.kvLabel}>Items</div>
                                <div className={styles.kvValue}>{items.length}</div>
                            </div>
                            <div className={styles.kv}>
                                <div className={styles.kvLabel}>File Types</div>
                                <div className={styles.kvValue}>
                                    <div className={styles.inlineBadges}>
                                        {distinctTypes.map(t => <span key={t} className={styles.badge}>{t}</span>)}
                                    </div>
                                </div>
                            </div>
                            <div className={styles.kv}>
                                <div className={styles.kvLabel}>Folders</div>
                                <div className={styles.kvValue}>{items.filter(i => i.isDirectory).length}</div>
                            </div>
                            <div className={styles.kv}>
                                <div className={styles.kvLabel}>Files</div>
                                <div className={styles.kvValue}>{items.filter(i => !i.isDirectory).length}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
