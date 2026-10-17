"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { KeyRound, LockKeyhole, LockOpen, FolderClosed, FileText } from "lucide-react";
import { api } from "@/utils/api";
import SoftLoading from "@/components/SoftLoading";
import styles from "./PrivateDisk.module.css";

const PrivateDisk = forwardRef(function PrivateDisk({ toast, onUnlocked }, ref) {
    const [status, setStatus] = useState(null);
    const [unlockType, setUnlockType] = useState("pin");
    const [secret, setSecret] = useState("");
    const [items, setItems] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentPath, setCurrentPath] = useState("");
    const uploadInputRef = useRef(null);

    const loadStatus = async () => {
        setLoading(true);
        const response = await api.get("/api/user/private");
        if (response?.success) {
            setStatus(response);
            if (response.type) {
                setUnlockType(response.type);
            }
        } else {
            setError(response?.message || "Failed to load Private Disk");
        }
        setLoading(false);
    };

    const loadFiles = async (folderPath = currentPath) => {
        const response = await api.get(`/api/user/private/files?path=${encodeURIComponent(folderPath)}`);
        if (response?.success) setItems(response);
        else setError(response?.message || "Private Disk is locked");
    };

    useEffect(() => { loadStatus(); }, []);
    useEffect(() => { if (status?.unlocked) loadFiles(currentPath); }, [status?.unlocked, currentPath]);
    useEffect(() => { if (status?.unlocked) onUnlocked?.(); }, [status?.unlocked, onUnlocked]);

    useEffect(() => {
        const lockOnPageExit = () => {
            fetch("/api/user/private", {
                method: "DELETE",
                credentials: "same-origin",
                keepalive: true
            }).catch(() => { });
        };

        window.addEventListener("pagehide", lockOnPageExit);
        return () => window.removeEventListener("pagehide", lockOnPageExit);
    }, []);

    const unlock = async (action) => {
        setError("");
        const response = await api.post("/api/user/private", { action, type: unlockType, secret });
        if (!response?.success) {
            setError(response?.message || "Unable to unlock Private Disk");
            return;
        }

        setSecret("");
        setStatus({ configured: true, unlocked: true, type: unlockType });
        toast?.addSuccess(action === "setup" ? "Private Disk created" : "Private Disk unlocked");
    };

    if (loading) return <div className={styles.loading}><SoftLoading /></div>;
    if (status?.unlocked) return null;

    if (!status?.unlocked) return (
        <div className={styles.content}>
            <div className={styles.setupCard}>
                <LockKeyhole size={28} />
                <h4>{status?.configured ? "Unlock Private Disk" : "Set up Private Disk"}</h4>
                <p className={styles.description}>
                    {status?.configured
                        ? `Enter your unlock ${unlockType} to view this private folder.`
                        : "Choose how you want to protect your private folder."}
                </p>

                {!status?.configured ? (
                    <select className={styles.select} value={unlockType} onChange={(event) => setUnlockType(event.target.value)}>
                        <option value="pin">PIN</option>
                        <option value="password">Password</option>
                    </select>
                ) : (
                    <p className={styles.typeIndicator}>Method: <strong>{unlockType.toUpperCase()}</strong></p>
                )}

                <input
                    className={styles.input}
                    type="password"
                    inputMode={unlockType === "pin" ? "numeric" : "text"}
                    pattern={unlockType === "pin" ? "[0-9]*" : undefined}
                    autoComplete={status?.configured ? "current-password" : "new-password"}
                    value={secret}
                    onChange={(event) => setSecret(unlockType === "pin" ? event.target.value.replace(/[^0-9]/g, "") : event.target.value)}
                    placeholder={unlockType === "pin" ? "PIN" : "Password"}
                />
                {error && <p className={styles.error}>{error}</p>}
                <button type="button" className={styles.primaryButton} onClick={() => unlock(status?.configured ? "unlock" : "setup")}>
                    <KeyRound size={15} /> {status?.configured ? "Unlock" : "Create Private Disk"}
                </button>
            </div>
        </div>
    );

    return (
        <div className={styles.privateDisk}>
            <div className={styles.header}>
                <h3><LockOpen size={20} /> Private Disk{currentPath ? ` / ${currentPath}` : ""}</h3>
            </div>
            <div className={styles.content}>
                <input ref={uploadInputRef} type="file" multiple hidden onChange={uploadFiles} />
                {error && <p className={styles.error}>{error}</p>}
                {(items?.folders || []).map((item) => <button type="button" key={item.path} className={styles.item} onClick={() => setCurrentPath(item.path)}><FolderClosed size={18} /><span className={styles.itemName}>{item.name}</span></button>)}
                {(items?.files || []).map((item) => <div key={item.path} className={styles.item}><FileText size={18} /><span className={styles.itemName}>{item.name}</span><span className={styles.itemMeta}>{item.size} bytes</span></div>)}
                {!items?.folders?.length && !items?.files?.length && <p className={styles.empty}>Private Disk is empty.</p>}
            </div>
        </div>
    );
});

export default PrivateDisk;