"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trash2, RefreshCw, Eye } from "lucide-react";
import { api } from "@/utils/api";
import SoftLoading from "@/components/SoftLoading";
import { FileViewer } from "@/components/app/FileViewer";
import ConfirmModal from "@/components/app/ConfirmModal";
import styles from "./Shared.module.css";

export default function TrashView({ toast }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [previewIndex, setPreviewIndex] = useState(null);
    const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const loadItems = async () => {
        setLoading(true);
        try {
            const response = await api.get("/api/user/trash");
            if (response?.success) setItems(response.items || []);
            else toast?.addError(response?.message || "Failed to load bin");
        } catch (error) {
            toast?.addError(error?.message || "Failed to load bin");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadItems(); }, []);

    const act = async (id, action) => {
        if (busyId) return;
        setBusyId(id);
        try {
            const response = await api.post("/api/user/trash", { id, action });
            if (response?.success) {
                setItems((current) => current.filter((item) => item.id !== id));
                window.dispatchEvent(new CustomEvent("trash-updated"));
                toast?.addSuccess(action === "restore" ? "Item restored" : "Item permanently deleted");
            } else toast?.addError(response?.message || "Bin operation failed");
        } catch (error) {
            toast?.addError(error?.message || "Bin operation failed");
        } finally {
            setBusyId("");
        }
    };

    const deleteAll = async () => {
        if (!items.length || busyId) return;
        setBusyId("all");
        try {
            const response = await api.post("/api/user/trash", { action: "deleteAll" });
            if (!response?.success) {
                toast?.addError(response?.message || "Failed to empty Bin");
                await loadItems();
                window.dispatchEvent(new CustomEvent("trash-updated"));
                return;
            }
            setItems([]);
            window.dispatchEvent(new CustomEvent("trash-updated"));
            const deletedCount = response.deletedCount ?? items.length;
            toast?.addSuccess(`${deletedCount} ${deletedCount === 1 ? "item" : "items"} permanently deleted`);
        } catch (error) {
            toast?.addError(error?.message || "Failed to empty Bin");
            await loadItems();
            window.dispatchEvent(new CustomEvent("trash-updated"));
        } finally {
            setBusyId("");
            setDeleteAllConfirm(false);
        }
    };

    const previewFiles = items
        .filter((item) => item.type === "file")
        .map((item) => ({
            id: item.id,
            trashId: item.id,
            name: item.name,
            path: item.originalPath,
            type: item.type,
            size: item.size || 0,
            modified: item.deletedAt
        }));

    return (
        <div className={styles.shared}>
            <div className={styles.sharedHeader}>
                <h3>Bin</h3>
                <div className={styles.trashHeaderActions}>
                    <button type="button" className={styles.dangerButton} onClick={() => setDeleteAllConfirm(true)} disabled={loading || Boolean(busyId) || items.length === 0}>
                        <Trash2 size={15} /> Delete all
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={loadItems} disabled={loading || Boolean(busyId)}>
                        <RefreshCw size={15} /> Refresh
                    </button>
                </div>
            </div>
            <div className={styles.sharedMainContent}>
                {loading ? <div className={styles.loadingCenter}><SoftLoading /></div> : items.length === 0 ? (
                    <p className={styles.emptyHint}>The bin is empty.</p>
                ) : items.map((item) => (
                    <div key={item.id} className={styles.itemRow}>
                        <div>
                            <div className={styles.itemTitle}>{item.name}</div>
                            <div className={styles.itemMeta}>{item.type} • Deleted {new Date(item.deletedAt).toLocaleString()} • Original location: {item.originalPath}</div>
                        </div>
                        <div className={styles.mainHeaderRow}>
                            {item.type === "file" && (
                                <button type="button" className={styles.secondaryButton} onClick={() => setPreviewIndex(previewFiles.findIndex((file) => file.trashId === item.id))} disabled={Boolean(busyId)}>
                                    <Eye size={15} /> Preview
                                </button>
                            )}
                            <button type="button" className={styles.secondaryButton} onClick={() => act(item.id, "restore")} disabled={Boolean(busyId)}>
                                <RotateCcw size={15} /> Restore
                            </button>
                            <button type="button" className={styles.dangerButton} onClick={() => setDeleteConfirm(item)} disabled={Boolean(busyId)}>
                                <Trash2 size={15} /> Delete forever
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {previewIndex !== null && previewFiles.length > 0 && (
                <FileViewer
                    isOpen={true}
                    currentFileIndex={previewIndex}
                    files={previewFiles}
                    onClose={() => setPreviewIndex(null)}
                    onNavigate={setPreviewIndex}
                    mobile={false}
                />
            )}
            <ConfirmModal
                open={deleteAllConfirm}
                title="Empty Bin"
                message={`Permanently delete all ${items.length} items in the Bin? This cannot be undone.`}
                confirmLabel="Delete all"
                destructive
                isLoading={busyId === "all"}
                onCancel={() => setDeleteAllConfirm(false)}
                onConfirm={deleteAll}
            />
            <ConfirmModal
                open={Boolean(deleteConfirm)}
                title="Delete forever"
                message={deleteConfirm ? `Permanently delete "${deleteConfirm.name}"? This cannot be undone.` : ""}
                confirmLabel="Delete"
                destructive
                isLoading={busyId === deleteConfirm?.id}
                onCancel={() => setDeleteConfirm(null)}
                onConfirm={async () => {
                    const item = deleteConfirm;
                    setDeleteConfirm(null);
                    if (item) await act(item.id, "delete");
                }}
            />
        </div>
    );
}
