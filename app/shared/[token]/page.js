// app/shared/[token]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/utils/api";
import { Download } from "lucide-react";
import SoftLoading from "@/components/SoftLoading";
import { withBasePath } from "@/lib/basePath";
import loadingStyles from "@/public/styles/loading.module.css";
import styles from "./page.module.css";

function getFileType(name) {
    const ext = String(name || "").split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext)) return "image";
    if (["mp4", "webm", "ogg", "avi", "mov", "wmv", "flv", "mkv"].includes(ext)) return "video";
    if (["mp3", "wav", "flac", "aac", "acc", "m4a", "m4b", "oga", "opus", "wma", "aif", "aiff"].includes(ext)) return "audio";
    if (["nef", "cr2", "arw", "dng", "raf", "rw2", "orf", "srw", "pef", "x3f", "3fr", "erf", "sr2", "kdc", "mef", "mos", "bay", "rwl", "raw"].includes(ext)) return "raw";
    if (["txt", "md", "json", "xml", "csv", "log"].includes(ext)) return "text";
    if (["js", "jsx", "ts", "tsx", "css", "scss", "sass", "html", "htm", "py", "java", "c", "cpp", "h", "cs", "php", "rb", "go", "rs", "swift", "sql", "sh", "bash", "ps1", "yml", "yaml", "toml", "ini", "cfg"].includes(ext)) return "code";
    if (String(name || "").toLowerCase().endsWith(".pdf")) return "pdf";
    return "file";
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

    const getThumbUrl = (item) => withBasePath(`/api/shares/access/${share?.token}/thumbnail?path=${encodeURIComponent(item.path)}&size=medium${passcodeQuery}`);

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
                <div className={styles.headerActions}>
                    <span className={styles.itemsCount}>
                        {items.length} item{items.length === 1 ? "" : "s"}
                    </span>
                    <a
                        href={withBasePath(`/api/shares/access/${share.token}/download-all${passcode ? `?passcode=${encodeURIComponent(passcode)}` : ""}`)}
                        download
                        className={styles.primaryButton}
                    >
                        Download all
                    </a>
                </div>
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
                            <a
                                href={withBasePath(`/api/shares/access/${share.token}/download?path=${encodeURIComponent(item.path)}${passcode ? `&passcode=${encodeURIComponent(passcode)}` : ""}`)}
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
        </main>
    );
}
