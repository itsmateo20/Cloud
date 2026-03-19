// app/shared/[token]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/utils/api";
import { Download, Eye, X } from "lucide-react";
import SoftLoading from "@/components/SoftLoading";
import loadingStyles from "@/public/styles/loading.module.css";
import styles from "./page.module.css";

function getFileType(name) {
    const ext = String(name || "").split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext)) return "image";
    if (["mp4", "webm", "ogg", "avi", "mov", "wmv", "flv", "mkv"].includes(ext)) return "video";
    return "file";
}

function isTextFile(name) {
    const ext = String(name || "").split(".").pop()?.toLowerCase();
    return ["txt", "md", "json", "xml", "csv", "log", "js", "jsx", "ts", "tsx", "css", "scss", "html", "yml", "yaml"].includes(ext);
}

function isPdfFile(name) {
    return String(name || "").toLowerCase().endsWith(".pdf");
}

export default function SharedPage() {
    const params = useParams();
    const token = params?.token;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [share, setShare] = useState(null);
    const [passcodeInput, setPasscodeInput] = useState("");
    const [passcode, setPasscode] = useState("");
    const [requiresPasscode, setRequiresPasscode] = useState(false);
    const [viewerItem, setViewerItem] = useState(null);
    const [viewerText, setViewerText] = useState("");
    const [viewerLoading, setViewerLoading] = useState(false);

    useEffect(() => {
        const run = async () => {
            if (!token) return;
            setLoading(true);
            setError("");

            const passcodeQuery = passcode ? `?passcode=${encodeURIComponent(passcode)}` : "";
            const res = await api.get(`/api/shares/access/${token}${passcodeQuery}`);
            if (!res?.success) {
                setRequiresPasscode(res?.code === "share_passcode_required" || res?.code === "share_passcode_invalid");
                setError(res?.message || "Unable to open this share.");
                setLoading(false);
                return;
            }

            setShare(res.share);
            setRequiresPasscode(false);
            setLoading(false);
        };

        run();
    }, [token, passcode]);

    const items = useMemo(() => (share?.items || []), [share]);
    const passcodeQuery = passcode ? `&passcode=${encodeURIComponent(passcode)}` : "";

    const getThumbUrl = (item) => `/api/shares/access/${share?.token}/thumbnail?path=${encodeURIComponent(item.path)}&size=medium${passcodeQuery}`;
    const getStreamUrl = (item) => `/api/shares/access/${share?.token}/stream?path=${encodeURIComponent(item.path)}${passcodeQuery}`;

    const openViewer = async (item) => {
        if (!share?.token || item.type !== "file") return;
        setViewerItem(item);
        setViewerText("");

        if (isTextFile(item.name)) {
            setViewerLoading(true);
            try {
                const res = await fetch(getStreamUrl(item));
                const text = await res.text();
                setViewerText(text || "");
            } catch {
                setViewerText("Failed to load file preview.");
            } finally {
                setViewerLoading(false);
            }
        }
    };

    if (loading) {
        return (
            <div className={styles.pageShell}>
                <div className={styles.heroCard}>
                    <div className={loadingStyles.loadingContainer}>
                        <SoftLoading />
                    </div>
                    <p className={styles.subtleText}>Loading shared files...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.pageShell}>
                <div className={styles.heroCard}>
                    <h2 className={styles.heroTitle}>Share unavailable</h2>
                    <p className={styles.subtleText}>{error}</p>
                    {requiresPasscode && (
                        <form
                            className={styles.unlockForm}
                            onSubmit={(e) => {
                                e.preventDefault();
                                setPasscode(passcodeInput);
                            }}
                        >
                            <label className={styles.unlockLabel}>Passcode</label>
                            <input
                                type="password"
                                placeholder="Enter passcode"
                                value={passcodeInput}
                                onChange={(e) => setPasscodeInput(e.target.value)}
                                className={styles.unlockInput}
                            />
                            <button type="submit" className={styles.primaryButton}>Unlock Share</button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <main className={styles.pageShell}>
            <section className={styles.headerPanel}>
                <div>
                    <h1 className={styles.heroTitle}>{share.name}</h1>
                    <p className={styles.subtleText}>
                        {share.requireLogin ? "Login protected share" : "Public share"}
                        {share.expiresAt ? ` • Expires ${new Date(share.expiresAt).toLocaleString()}` : ""}
                    </p>
                </div>
                <a
                    href={`/api/shares/access/${share.token}/download-all${passcode ? `?passcode=${encodeURIComponent(passcode)}` : ""}`}
                    download
                    className={styles.primaryButton}
                >
                    Download all
                </a>
            </section>

            <section className={styles.itemsGrid}>
                {items.length === 0 ? (
                    <div className={styles.emptyState}>No files are currently available in this share.</div>
                ) : items.map((item) => (
                    <div
                        key={item.id}
                        className={styles.itemCard}
                    >
                        <div className={styles.thumbWrap}>
                            <img src={getThumbUrl(item)} alt={item.name} className={styles.thumbImage} loading="lazy" decoding="async" />
                        </div>
                        <div className={styles.itemMeta}>
                            <span className={styles.itemName}>{item.name}</span>
                            <span className={styles.itemType}>{item.type === "folder" ? "folder zip" : getFileType(item.name)}</span>
                        </div>
                        <div className={styles.itemActions}>
                            {item.type === "file" && (
                                <button type="button" className={styles.secondaryButton} onClick={() => openViewer(item)}>
                                    <Eye size={16} />
                                    View
                                </button>
                            )}
                            <a
                                href={`/api/shares/access/${share.token}/download?path=${encodeURIComponent(item.path)}${passcode ? `&passcode=${encodeURIComponent(passcode)}` : ""}`}
                                download
                                className={styles.secondaryButton}
                            >
                                <Download size={16} />
                                Download
                            </a>
                        </div>
                    </div>
                ))}
            </section>

            {viewerItem && (
                <div className={styles.viewerOverlay} onClick={() => setViewerItem(null)}>
                    <div className={styles.viewerModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.viewerHeader}>
                            <h3>{viewerItem.name}</h3>
                            <button type="button" className={styles.closeViewerButton} onClick={() => setViewerItem(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className={styles.viewerBody}>
                            {getFileType(viewerItem.name) === "image" && (
                                <img src={getStreamUrl(viewerItem)} alt={viewerItem.name} className={styles.viewerImage} />
                            )}
                            {getFileType(viewerItem.name) === "video" && (
                                <video src={getStreamUrl(viewerItem)} controls className={styles.viewerVideo} />
                            )}
                            {isPdfFile(viewerItem.name) && (
                                <iframe src={getStreamUrl(viewerItem)} title={viewerItem.name} className={styles.viewerFrame} />
                            )}
                            {isTextFile(viewerItem.name) && (
                                viewerLoading ? (
                                    <div className={styles.viewerLoading}><SoftLoading /></div>
                                ) : (
                                    <pre className={styles.viewerText}>{viewerText}</pre>
                                )
                            )}
                            {!isPdfFile(viewerItem.name) && !isTextFile(viewerItem.name) && getFileType(viewerItem.name) === "file" && (
                                <div className={styles.viewerUnsupported}>Preview unavailable for this file type. Use Download.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
