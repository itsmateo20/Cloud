"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trash2, RefreshCw, Eye } from "lucide-react";
import { api } from "@/utils/api";
import SoftLoading from "@/components/SoftLoading";
import { FileViewer } from "@/components/app/FileViewer";
import styles from "./SharedWithYou.module.css";

export default function TrashView({ toast }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [previewIndex, setPreviewIndex] = useState(null);

    const loadItems = async () => {
        setLoading(true);
        const response = await api.get("/api/user/trash");
        if (response?.success) setItems(response.items || []);
        else toast?.addError(response?.message || "Failed to load bin");
        setLoading(false);
    };

    useEffect(() => { loadItems(); }, []);

    const act = async (id, action) => {
        setBusyId(id);
        const response = await api.post("/api/user/trash", { id, action });
        if (response?.success) {
            setItems((current) => current.filter((item) => item.id !== id));
            window.dispatchEvent(new CustomEvent("trash-updated"));
            toast?.addSuccess(action === "restore" ? "Item restored" : "Item permanently deleted");
        } else toast?.addError(response?.message || "Bin operation failed");
        setBusyId("");
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
                <button type="button" className={styles.secondaryButton} onClick={loadItems} disabled={loading}>
                    <RefreshCw size={15} /> Refresh
                </button>
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
                                <button type="button" className={styles.secondaryButton} onClick={() => setPreviewIndex(previewFiles.findIndex((file) => file.trashId === item.id))}>
                                    <Eye size={15} /> Preview
                                </button>
                            )}
                            <button type="button" className={styles.secondaryButton} onClick={() => act(item.id, "restore")} disabled={busyId === item.id}>
                                <RotateCcw size={15} /> Restore
                            </button>
                            <button type="button" className={styles.dangerButton} onClick={() => act(item.id, "delete")} disabled={busyId === item.id}>
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
        </div>
    );
}
