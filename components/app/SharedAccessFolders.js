"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, File, FolderClosed, FolderUsers, LogOut, Pencil, Trash2, X } from "lucide-react";
import SoftLoading from "@/components/SoftLoading";
import { api } from "@/utils/api";
import { withBasePath } from "@/lib/basePath";
import ConfirmModal from "@/components/app/ConfirmModal";
import styles from "./SharedAccessFolders.module.css";

const SharedAccessFolders = forwardRef(function SharedAccessFolders({ toast, viewMode = "grid", sortBy = "name", mobile = false, onSelectionChange, onReadyChange }, ref) {
    const [loading, setLoading] = useState(true);
    const [shares, setShares] = useState([]);
    const [selectedShareId, setSelectedShareId] = useState(null);
    const [browsePath, setBrowsePath] = useState("");
    const [browseItems, setBrowseItems] = useState([]);
    const [browsing, setBrowsing] = useState(false);
    const browseViewMode = viewMode === "list" ? "list" : "grid";
    const [createOpen, setCreateOpen] = useState(false);
    const [createFolderPath, setCreateFolderPath] = useState("");
    const [createName, setCreateName] = useState("");
    const [createEmails, setCreateEmails] = useState("");
    const [createBusy, setCreateBusy] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [nameModal, setNameModal] = useState({ open: false, mode: "create", type: "folder", item: null, value: "" });
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, items: [], loading: false });
    const uploadInputRef = useRef(null);
    const itemContainerRef = useRef(null);
    const lastSelectedItemRef = useRef(null);
    const marqueeStartRef = useRef(null);
    const [marqueeRect, setMarqueeRect] = useState(null);

    const selectedShare = shares.find((share) => Number(share.id) === Number(selectedShareId)) || null;
    const sortedItems = useMemo(() => {
        const items = [...browseItems];
        items.sort((a, b) => {
            if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
            if (sortBy === "modified") return new Date(b.modified || 0) - new Date(a.modified || 0);
            if (sortBy === "size") return (b.size || 0) - (a.size || 0);
            if (sortBy === "type") return a.name.split(".").pop().localeCompare(b.name.split(".").pop());
            return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        });
        return items;
    }, [browseItems, sortBy]);

    const loadShares = useCallback(async () => {
        setLoading(true);
        const response = await api.get("/api/shared-access");
        if (!response?.success) {
            setShares([]);
            toast?.addError(response?.message || "Failed to load shared folders");
        } else {
            setShares(response.shares || []);
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        loadShares();
    }, [loadShares]);

    const loadBrowse = useCallback(async (shareId, folderPath = "") => {
        if (!shareId) return;
        setBrowsing(true);
        try {
            const response = await api.get(`/api/shared-access/${shareId}/browse?path=${encodeURIComponent(folderPath)}`);
            if (!response?.success) {
                setBrowseItems([]);
                toast?.addError(response?.message || "Failed to load folder");
                return;
            }
            setBrowseItems(response.items || []);
        } catch (error) {
            setBrowseItems([]);
            toast?.addError(error.message || "Failed to load folder");
        } finally {
            setBrowsing(false);
        }
    }, [toast]);

    useEffect(() => {
        if (selectedShareId) loadBrowse(selectedShareId, browsePath);
    }, [selectedShareId, browsePath, loadBrowse]);

    useEffect(() => {
        setSelectedItems([]);
        lastSelectedItemRef.current = null;
        onSelectionChange?.([]);
    }, [selectedShareId, browsePath, onSelectionChange]);

    useEffect(() => {
        onReadyChange?.(Boolean(selectedShare));
    }, [selectedShare, onReadyChange]);

    const toggleSelectedItem = (item, event) => {
        event?.stopPropagation();
        let next;
        if (event?.ctrlKey || event?.metaKey) {
            const exists = selectedItems.some((selected) => selected.path === item.path);
            next = exists
                ? selectedItems.filter((selected) => selected.path !== item.path)
                : [...selectedItems, item];
        } else if (event?.shiftKey) {
            const anchor = lastSelectedItemRef.current;
            if (!anchor) {
                next = [item];
            } else {
                const anchorIndex = sortedItems.findIndex((candidate) => candidate.path === anchor.path);
                const currentIndex = sortedItems.findIndex((candidate) => candidate.path === item.path);
                if (anchorIndex === -1 || currentIndex === -1) {
                    next = [item];
                } else {
                    const start = Math.min(anchorIndex, currentIndex);
                    const end = Math.max(anchorIndex, currentIndex);
                    next = sortedItems.slice(start, end + 1);
                }
            }
        } else {
            next = [item];
        }
        lastSelectedItemRef.current = item;
        setSelectedItems(next);
        onSelectionChange?.(next);
    };

    const openShare = (share) => {
        setSelectedShareId(share.id);
        setBrowsePath("");
    };

    const leaveShare = async (share) => {
        const response = await api.delete(`/api/shared-access/${share.id}`);
        if (!response?.success) {
            toast?.addError(response?.message || "Failed to leave shared folder");
            return;
        }
        toast?.addSuccess(share.isOwner ? "Shared folder removed" : "You left the shared folder");
        if (Number(selectedShareId) === Number(share.id)) {
            setSelectedShareId(null);
            setBrowsePath("");
        }
        await loadShares();
    };

    const createShare = async () => {
        const emails = createEmails.split(/[,;\n]/).map((email) => email.trim()).filter(Boolean);
        if (!createFolderPath.trim()) {
            toast?.addError("Enter the folder path");
            return;
        }
        setCreateBusy(true);
        const response = await api.post("/api/shared-access", {
            folderPath: createFolderPath.trim(),
            name: createName.trim() || "Shared Folder",
            allowedEmails: emails
        });
        setCreateBusy(false);
        if (!response?.success) {
            toast?.addError(response?.message || "Failed to share folder");
            return;
        }
        toast?.addSuccess("Shared folder created");
        setCreateOpen(false);
        setCreateFolderPath("");
        setCreateName("");
        setCreateEmails("");
        setSelectedShareId(response.share.id);
        setBrowsePath("");
        await loadShares();
    };

    const createItem = async (type) => {
        setNameModal({
            open: true,
            mode: "create",
            type,
            item: null,
            value: ""
        });
    };

    const submitNameModal = async () => {
        const name = nameModal.value.trim();
        if (!name) return;
        setNameModal((current) => ({ ...current, loading: true }));
        if (nameModal.mode === "rename") {
            const item = nameModal.item;
            const response = await api.post(`/api/shared-access/${selectedShareId}/files`, {
                action: "rename",
                oldPath: item.path,
                newName: name
            });
            setNameModal((current) => ({ ...current, open: false, loading: false }));
            if (!response?.success) toast?.addError(response?.message || "Failed to rename item");
            else await loadBrowse(selectedShareId, browsePath);
            return;
        }
        const response = await api.post(`/api/shared-access/${selectedShareId}/files`, {
            action: "create",
            path: browsePath,
            name,
            type: nameModal.type
        });
        setNameModal((current) => ({ ...current, open: false, loading: false }));
        if (!response?.success) toast?.addError(response?.message || "Failed to create item");
        else await loadBrowse(selectedShareId, browsePath);
    };

    const renameItem = async (item) => {
        setNameModal({
            open: true,
            mode: "rename",
            type: "file",
            item,
            value: item.name
        });
    };

    const deleteItem = async (item) => {
        setDeleteConfirm({ open: true, items: [item], loading: false });
    };

    const confirmDeleteSelected = async () => {
        const items = deleteConfirm.items;
        if (items.length === 0) return;
        setDeleteConfirm((current) => ({ ...current, loading: true }));
        const response = await api.post(`/api/shared-access/${selectedShareId}/files`, {
            action: "delete",
            paths: items.map((item) => item.path)
        });
        setDeleteConfirm({ open: false, items: [], loading: false });
        if (!response?.success) toast?.addError(response?.message || "Failed to delete selected items");
        else {
            toast?.addSuccess(`${items.length} item${items.length === 1 ? "" : "s"} deleted`);
            setSelectedItems([]);
            lastSelectedItemRef.current = null;
            onSelectionChange?.([]);
            await loadBrowse(selectedShareId, browsePath);
        }
    };

    const deleteSelectedItems = async () => {
        if (selectedItems.length === 0) return;
        setDeleteConfirm({ open: true, items: [...selectedItems], loading: false });
    };

    const uploadFiles = async (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (!files.length) return;

        const formData = new FormData();
        formData.set("path", browsePath);
        files.forEach((file) => formData.append("files", file));
        const response = await fetch(withBasePath(`/api/shared-access/${selectedShareId}/files`), {
            method: "POST",
            body: formData,
            credentials: "same-origin"
        }).then((result) => result.json()).catch(() => ({ success: false, message: "Upload failed" }));
        if (!response?.success) toast?.addError(response?.message || "Upload failed");
        else await loadBrowse(selectedShareId, browsePath);
    };

    useImperativeHandle(ref, () => ({
        openShareModal: (items = []) => {
            const folder = (items || []).find((item) => item.type === "folder") || (items || [])[0];
            setCreateFolderPath(folder?.path || browsePath || "");
            setCreateName(folder?.name || "Shared Folder");
            setCreateEmails("");
            setCreateOpen(true);
        },
        createFolder: () => createItem("folder"),
        createTextFile: () => createItem("text"),
        uploadFiles: (files = null) => {
            if (files?.length) {
                const data = new FormData();
                data.set("path", browsePath);
                files.forEach((file) => data.append("files", file));
                fetch(withBasePath(`/api/shared-access/${selectedShareId}/files`), {
                    method: "POST",
                    body: data,
                    credentials: "same-origin"
                }).then((response) => response.json()).then(async (response) => {
                    if (!response?.success) toast?.addError(response?.message || "Upload failed");
                    else await loadBrowse(selectedShareId, browsePath);
                }).catch(() => toast?.addError("Upload failed"));
                return;
            }
            uploadInputRef.current?.click();
        },
        downloadSelected: async () => {
            if (selectedItems.length === 0) return;
            if (selectedItems.length === 1) {
                const link = document.createElement("a");
                link.href = withBasePath(`/api/shared-access/${selectedShareId}/download?path=${encodeURIComponent(selectedItems[0].path)}`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                return;
            }
            const response = await fetch(withBasePath(`/api/shared-access/${selectedShareId}/download?paths=${encodeURIComponent(JSON.stringify(selectedItems.map((item) => item.path)))}`), {
                credentials: "same-origin"
            });
            if (!response.ok) {
                toast?.addError("Failed to download selected items");
                return;
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `shared-selection-${selectedItems.length}.zip`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        },
        deleteSelected: deleteSelectedItems,
        renameSelected: () => {
            if (selectedItems.length === 1) renameItem(selectedItems[0]);
        },
        selectAll: () => {
            setSelectedItems(sortedItems);
            lastSelectedItemRef.current = sortedItems.at(-1) || null;
            onSelectionChange?.(sortedItems);
        },
        clearSelection: () => {
            setSelectedItems([]);
            lastSelectedItemRef.current = null;
            onSelectionChange?.([]);
        },
        getSelectableCount: () => sortedItems.length,
        refresh: () => loadBrowse(selectedShareId, browsePath),
        getShareId: () => selectedShareId,
        getBrowsePath: () => browsePath,
        hasShare: () => Boolean(selectedShareId)
    }), [selectedItems, sortedItems, browsePath, selectedShareId, toast, loadBrowse, onSelectionChange]);

    const startMarqueeSelection = (event) => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.target.closest("[data-share-access-item]")) return;
        const container = itemContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        if (!rect) return;

        const startX = event.clientX - rect.left;
        const startY = event.clientY - rect.top;
        marqueeStartRef.current = { startX, startY };
        setMarqueeRect({ left: startX, top: startY, width: 0, height: 0 });
        setSelectedItems([]);
        lastSelectedItemRef.current = null;
        onSelectionChange?.([]);
        event.preventDefault();

        const handleMove = (moveEvent) => {
            const currentRect = container.getBoundingClientRect();
            if (!currentRect) return;
            const x = moveEvent.clientX - currentRect.left;
            const y = moveEvent.clientY - currentRect.top;
            const left = Math.min(startX, x);
            const top = Math.min(startY, y);
            const width = Math.abs(x - startX);
            const height = Math.abs(y - startY);
            setMarqueeRect({ left, top, width, height });

            const selectionRect = {
                left: left + currentRect.left,
                top: top + currentRect.top,
                right: left + width + currentRect.left,
                bottom: top + height + currentRect.top
            };
            const next = Array.from(container.querySelectorAll("[data-share-access-item]")).reduce((items, element) => {
                const itemRect = element.getBoundingClientRect();
                const intersects = itemRect.left < selectionRect.right &&
                    itemRect.right > selectionRect.left &&
                    itemRect.top < selectionRect.bottom &&
                    itemRect.bottom > selectionRect.top;
                if (intersects) {
                    const path = element.getAttribute("data-share-access-item");
                    const item = sortedItems.find((candidate) => candidate.path === path);
                    if (item) items.push(item);
                }
                return items;
            }, []);
            setSelectedItems(next);
            onSelectionChange?.(next);
        };

        const handleUp = () => {
            setMarqueeRect(null);
            marqueeStartRef.current = null;
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
    };

    const getShareLabel = (share) => (
        share.isOwner
            ? (share.name || "Shared Folder")
            : (share.ownerEmail || "Shared Folder")
    );

    const mobileShareOpened = mobile && Boolean(selectedShare);

    return (
        <div className={`${styles.sharedAccess} ${mobile ? styles.mobileSharedAccess : ""}`}>
            {(!mobile || !mobileShareOpened) && (
            <aside className={`${styles.shareList} ${mobile ? styles.mobileSharePicker : ""}`}>
                <div className={styles.shareListHeader}>
                    <span>Shared folders</span>
                    <span>{shares.length}</span>
                </div>
                {loading ? (
                    <div className={styles.loadingCenter}><SoftLoading /></div>
                ) : shares.length === 0 ? (
                    <p className={styles.emptyText}>No shared folders yet.</p>
                ) : shares.map((share) => (
                    <div key={share.id} className={`${styles.shareRow} ${Number(selectedShareId) === Number(share.id) ? styles.activeShare : ""}`}>
                        <button type="button" className={styles.shareOpen} onClick={() => openShare(share)}>
                            <FolderUsers size={22} />
                            <span title={getShareLabel(share)}>{getShareLabel(share)}</span>
                        </button>
                        <button type="button" className={styles.leaveButton} onClick={() => leaveShare(share)} title={share.isOwner ? "Delete share" : "Leave share"}>
                            <LogOut size={15} />
                        </button>
                    </div>
                ))}
            </aside>
            )}

            {(!mobile || mobileShareOpened) && (
            <section className={`${styles.folderMain} ${mobile ? styles.mobileFolderMain : ""}`}>
                {mobile && (
                    <div className={styles.mobileDetailHeader}>
                        <button
                            type="button"
                            className={styles.mobileDetailBackButton}
                            onClick={() => {
                                setSelectedShareId(null);
                                setBrowsePath("");
                            }}
                        >
                            <ArrowLeft size={18} />
                            <span>All folders</span>
                        </button>
                        <div className={styles.mobileDetailHeading}>
                            <strong>{getShareLabel(selectedShare)}</strong>
                            <span>{selectedShare?.isOwner ? "Shared by you" : "Shared with you"}</span>
                        </div>
                    </div>
                )}
                {!selectedShare ? (
                    <div className={styles.emptyMain}>
                        <FolderUsers size={48} />
                        <p>Select a shared folder.</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.folderToolbar}>
                            <div className={styles.breadcrumbs}>
                                {browsePath && (
                                    <button type="button" className={styles.iconButton} onClick={() => setBrowsePath(browsePath.includes("/") ? browsePath.substring(0, browsePath.lastIndexOf("/")) : "")}>
                                        <ArrowLeft size={16} />
                                    </button>
                                )}
                                <button type="button" onClick={() => setBrowsePath("")}>{getShareLabel(selectedShare)}</button>
                                {browsePath.split("/").filter(Boolean).map((segment, index, segments) => (
                                    <button key={`${segment}-${index}`} type="button" onClick={() => setBrowsePath(segments.slice(0, index + 1).join("/"))}>/ {segment}</button>
                                ))}
                            </div>
                            <input ref={uploadInputRef} type="file" multiple hidden onChange={uploadFiles} />
                        </div>

                        {browsing ? (
                            <div className={styles.loadingCenter}><SoftLoading /></div>
                        ) : browseItems.length === 0 ? (
                            <p className={styles.emptyText}>This folder is empty.</p>
                        ) : (
                            <div
                                ref={itemContainerRef}
                                className={browseViewMode === "grid" ? styles.gridView : styles.listView}
                                onMouseDown={startMarqueeSelection}
                            >
                                {sortedItems.map((item) => (
                                    <div key={item.id} data-share-access-item={item.path} className={`${browseViewMode === "grid" ? styles.tile : styles.listRow} ${selectedItems.some((selected) => selected.path === item.path) ? styles.selectedRow : ""}`} onClick={(event) => toggleSelectedItem(item, event)} onDoubleClick={() => item.type === "folder" && setBrowsePath(item.browsePath)}>
                                        <button type="button" className={styles.itemOpen} onClick={(event) => toggleSelectedItem(item, event)}>
                                            <ItemVisual
                                                item={item}
                                                shareId={selectedShareId}
                                                size={browseViewMode === "grid" ? 42 : 24}
                                                variant={browseViewMode === "grid" ? "tile" : "small"}
                                            />
                                            <span title={item.name}>{item.name}</span>
                                        </button>
                                        <ItemActions item={item} onRename={renameItem} onDelete={deleteItem} shareId={selectedShareId} />
                                    </div>
                                ))}
                                {marqueeRect && (
                                    <div
                                        className={styles.marqueeSelection}
                                        style={{
                                            left: marqueeRect.left,
                                            top: marqueeRect.top,
                                            width: marqueeRect.width,
                                            height: marqueeRect.height
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </>
                )}
            </section>
            )}

            {createOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}><h4>Share a folder</h4><button type="button" onClick={() => setCreateOpen(false)}><X size={18} /></button></div>
                        <label>Folder path</label>
                        <input value={createFolderPath} onChange={(event) => setCreateFolderPath(event.target.value)} placeholder="Example: Projects/My Folder" />
                        <label>Share name</label>
                        <input value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Shared Folder" />
                        <label>User emails</label>
                        <textarea value={createEmails} onChange={(event) => setCreateEmails(event.target.value)} placeholder="person@example.com" />
                        <div className={styles.modalActions}>
                            <button type="button" onClick={() => setCreateOpen(false)}>Cancel</button>
                            <button type="button" className={styles.primaryButton} disabled={createBusy} onClick={createShare}>Share folder</button>
                        </div>
                    </div>
                </div>
            )}

            {nameModal.open && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h4>{nameModal.mode === "rename" ? "Rename item" : nameModal.type === "folder" ? "Create folder" : "Create file"}</h4>
                            <button type="button" onClick={() => setNameModal((current) => ({ ...current, open: false }))}>
                                <X size={18} />
                            </button>
                        </div>
                        <input
                            autoFocus
                            value={nameModal.value}
                            onChange={(event) => setNameModal((current) => ({ ...current, value: event.target.value }))}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") submitNameModal();
                            }}
                            placeholder={nameModal.mode === "rename" ? "New name" : "Name"}
                        />
                        <div className={styles.modalActions}>
                            <button type="button" onClick={() => setNameModal((current) => ({ ...current, open: false }))}>Cancel</button>
                            <button type="button" className={styles.primaryButton} disabled={nameModal.loading || !nameModal.value.trim()} onClick={submitNameModal}>
                                {nameModal.mode === "rename" ? "Rename" : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={deleteConfirm.open}
                title={deleteConfirm.items.length === 1 ? "Delete item" : "Delete selected items"}
                message={deleteConfirm.items.length === 1
                    ? `Delete "${deleteConfirm.items[0]?.name}"? This cannot be undone.`
                    : `Delete ${deleteConfirm.items.length} selected items? This cannot be undone.`}
                confirmLabel="Delete"
                destructive
                isLoading={deleteConfirm.loading}
                onCancel={() => setDeleteConfirm({ open: false, items: [], loading: false })}
                onConfirm={confirmDeleteSelected}
            />

        </div>
    );
});

function ItemActions({ item, onRename, onDelete, shareId }) {
    return (
        <div className={styles.itemActions} onClick={(event) => event.stopPropagation()}>
            {item.type === "file" && (
                <a href={withBasePath(`/api/shared-access/${shareId}/download?path=${encodeURIComponent(item.path)}`)} title="Download"><Download size={14} /></a>
            )}
            <button type="button" onClick={() => onRename(item)} title="Rename"><Pencil size={14} /></button>
            <button type="button" onClick={() => onDelete(item)} title="Delete"><Trash2 size={14} /></button>
        </div>
    );
}

function ItemVisual({ item, shareId, size, variant }) {
    const [thumbnailFailed, setThumbnailFailed] = useState(false);
    const isImage = item.type === "file" && ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"]
        .includes(item.name.split(".").pop()?.toLowerCase());

    useEffect(() => {
        setThumbnailFailed(false);
    }, [item.path, shareId]);

    if (item.type === "folder") return <FolderClosed size={size} />;
    if (variant !== "tile" || !isImage || thumbnailFailed) return <File size={size} />;

    return (
        <img
            src={withBasePath(`/api/shared-access/${shareId}/thumbnail?path=${encodeURIComponent(item.path)}&size=medium`)}
            alt=""
            className={styles.tileThumbnail}
            loading="lazy"
            decoding="async"
            onError={() => setThumbnailFailed(true)}
        />
    );
}

export default SharedAccessFolders;
