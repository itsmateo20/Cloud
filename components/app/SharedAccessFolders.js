"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, File, FolderClosed, FolderUsers, LogOut, Pencil, Trash2, X } from "lucide-react";
import SoftLoading from "@/components/SoftLoading";
import { api } from "@/utils/api";
import { withBasePath } from "@/lib/basePath";
import styles from "./SharedAccessFolders.module.css";

const SharedAccessFolders = forwardRef(function SharedAccessFolders({ toast, viewMode = "details", sortBy = "name", onSelectionChange, onReadyChange }, ref) {
    const [loading, setLoading] = useState(true);
    const [shares, setShares] = useState([]);
    const [selectedShareId, setSelectedShareId] = useState(null);
    const [browsePath, setBrowsePath] = useState("");
    const [browseItems, setBrowseItems] = useState([]);
    const [browsing, setBrowsing] = useState(false);
    const browseViewMode = viewMode === "details" || viewMode === "list" ? viewMode : "grid";
    const [createOpen, setCreateOpen] = useState(false);
    const [createFolderPath, setCreateFolderPath] = useState("");
    const [createName, setCreateName] = useState("");
    const [createEmails, setCreateEmails] = useState("");
    const [createBusy, setCreateBusy] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [editItem, setEditItem] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [editBusy, setEditBusy] = useState(false);
    const uploadInputRef = useRef(null);

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
        onSelectionChange?.([]);
    }, [selectedShareId, browsePath, onSelectionChange]);

    useEffect(() => {
        onReadyChange?.(Boolean(selectedShare));
    }, [selectedShare, onReadyChange]);

    const toggleSelectedItem = (item, event) => {
        event?.stopPropagation();
        setSelectedItems((current) => {
            const exists = current.some((selected) => selected.path === item.path);
            const next = exists
                ? current.filter((selected) => selected.path !== item.path)
                : [...current, item];
            onSelectionChange?.(next);
            return next;
        });
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
        const name = window.prompt(type === "folder" ? "Folder name" : "File name");
        if (!name) return;
        const response = await api.post(`/api/shared-access/${selectedShareId}/files`, {
            action: "create",
            path: browsePath,
            name,
            type
        });
        if (!response?.success) toast?.addError(response?.message || "Failed to create item");
        else await loadBrowse(selectedShareId, browsePath);
    };

    const renameItem = async (item) => {
        const name = window.prompt("New name", item.name);
        if (!name || name === item.name) return;
        const response = await api.post(`/api/shared-access/${selectedShareId}/files`, {
            action: "rename",
            oldPath: item.path,
            newName: name
        });
        if (!response?.success) toast?.addError(response?.message || "Failed to rename item");
        else await loadBrowse(selectedShareId, browsePath);
    };

    const deleteItem = async (item) => {
        if (!window.confirm(`Delete "${item.name}"?`)) return;
        const response = await api.post(`/api/shared-access/${selectedShareId}/files`, {
            action: "delete",
            paths: [item.path]
        });
        if (!response?.success) toast?.addError(response?.message || "Failed to delete item");
        else await loadBrowse(selectedShareId, browsePath);
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

    const openEditor = async (item) => {
        const ext = item.name.split(".").pop()?.toLowerCase();
        const editable = ["txt", "md", "json", "js", "jsx", "ts", "tsx", "css", "html", "xml", "csv", "log", "env"].includes(ext);
        if (!editable) {
            toast?.addInfo("This file type cannot be edited here");
            return;
        }
        const response = await fetch(withBasePath(`/api/shared-access/${selectedShareId}/stream?path=${encodeURIComponent(item.path)}`), { credentials: "same-origin" });
        if (!response.ok) {
            toast?.addError("Failed to open file");
            return;
        }
        setEditItem(item);
        setEditContent(await response.text());
    };

    const saveEditor = async () => {
        if (!editItem) return;
        setEditBusy(true);
        const response = await api.post(`/api/shared-access/${selectedShareId}/files`, {
            action: "edit",
            path: editItem.path,
            content: editContent
        });
        setEditBusy(false);
        if (!response?.success) toast?.addError(response?.message || "Failed to save file");
        else {
            toast?.addSuccess("File saved");
            setEditItem(null);
            await loadBrowse(selectedShareId, browsePath);
        }
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
        downloadSelected: () => selectedItems.forEach((item) => {
            const link = document.createElement("a");
            link.href = withBasePath(`/api/shared-access/${selectedShareId}/download?path=${encodeURIComponent(item.path)}`);
            link.click();
        }),
        deleteSelected: () => selectedItems.forEach((item) => deleteItem(item)),
        renameSelected: () => {
            if (selectedItems.length === 1) renameItem(selectedItems[0]);
        },
        refresh: () => loadBrowse(selectedShareId, browsePath),
        openEditor: (item) => openEditor(item),
        hasShare: () => Boolean(selectedShareId)
    }), [selectedItems, browsePath, selectedShareId, toast, loadBrowse]);

    const getShareLabel = (share) => (
        share.isOwner
            ? (share.name || "Shared Folder")
            : (share.ownerEmail || "Shared Folder")
    );

    return (
        <div className={styles.sharedAccess}>
            <aside className={styles.shareList}>
                <div className={styles.shareListHeader}>
                    <span>Shared folders</span>
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

            <section className={styles.folderMain}>
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
                        ) : browseViewMode === "details" ? (
                            <div className={styles.detailsView}>
                                <div className={styles.detailsHeader}><span>Name</span><span>Type</span><span>Size</span><span /></div>
                                {sortedItems.map((item) => (
                                    <div key={item.id} className={`${styles.detailsRow} ${selectedItems.some((selected) => selected.path === item.path) ? styles.selectedRow : ""}`} onClick={(event) => toggleSelectedItem(item, event)} onDoubleClick={() => item.type === "folder" && setBrowsePath(item.browsePath)}>
                                        <button type="button" className={styles.detailsName} onClick={(event) => toggleSelectedItem(item, event)}>
                                            {item.type === "folder" ? <FolderClosed size={18} /> : <File size={18} />}
                                            <span>{item.name}</span>
                                        </button>
                                        <span>{item.type}</span>
                                        <span>{item.type === "file" ? `${item.size} bytes` : "—"}</span>
                                        <ItemActions item={item} onEdit={openEditor} onRename={renameItem} onDelete={deleteItem} shareId={selectedShareId} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={browseViewMode === "grid" ? styles.gridView : styles.listView}>
                                {sortedItems.map((item) => (
                                    <div key={item.id} className={`${browseViewMode === "grid" ? styles.tile : styles.listRow} ${selectedItems.some((selected) => selected.path === item.path) ? styles.selectedRow : ""}`} onClick={(event) => toggleSelectedItem(item, event)} onDoubleClick={() => item.type === "folder" && setBrowsePath(item.browsePath)}>
                                        <button type="button" className={styles.itemOpen} onClick={(event) => toggleSelectedItem(item, event)}>
                                            {item.type === "folder" ? <FolderClosed size={browseViewMode === "grid" ? 42 : 24} /> : <File size={browseViewMode === "grid" ? 38 : 22} />}
                                            <span title={item.name}>{item.name}</span>
                                        </button>
                                        <ItemActions item={item} onEdit={openEditor} onRename={renameItem} onDelete={deleteItem} shareId={selectedShareId} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </section>

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

            {editItem && (
                <div className={styles.modalOverlay}>
                    <div className={styles.editorModal}>
                        <div className={styles.modalHeader}><h4>{editItem.name}</h4><button type="button" onClick={() => setEditItem(null)}><X size={18} /></button></div>
                        <textarea className={styles.editor} value={editContent} onChange={(event) => setEditContent(event.target.value)} />
                        <div className={styles.modalActions}>
                            <button type="button" onClick={() => setEditItem(null)}>Cancel</button>
                            <button type="button" className={styles.primaryButton} disabled={editBusy} onClick={saveEditor}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

function ItemActions({ item, onEdit, onRename, onDelete, shareId }) {
    return (
        <div className={styles.itemActions} onClick={(event) => event.stopPropagation()}>
            {item.type === "file" && (
                <>
                    <button type="button" onClick={() => onEdit(item)} title="Edit"><Pencil size={14} /></button>
                    <a href={withBasePath(`/api/shared-access/${shareId}/download?path=${encodeURIComponent(item.path)}`)} title="Download"><Download size={14} /></a>
                </>
            )}
            <button type="button" onClick={() => onRename(item)} title="Rename"><Pencil size={14} /></button>
            <button type="button" onClick={() => onDelete(item)} title="Delete"><Trash2 size={14} /></button>
        </div>
    );
}

export default SharedAccessFolders;
