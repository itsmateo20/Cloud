"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
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
        if (response?.success) setStatus(response);
        else setError(response?.message || "Failed to load Private Disk");
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

    const createFolder = async () => {
        const name = window.prompt("Folder name");
        if (!name?.trim()) return;
        const formData = new FormData();
        formData.append("action", "create_folder");
        formData.append("path", currentPath);
        formData.append("name", name.trim());
        const response = await api.upload("/api/user/private/files", formData);
        if (response?.success) loadFiles();
        else setError(response?.message || "Failed to create folder");
    };

    const createItem = async ({ type, name }) => {
        const formData = new FormData();
        formData.append("action", type === "folder" ? "create_folder" : "create_file");
        formData.append("path", currentPath);
        formData.append("name", name);
        const response = await api.upload("/api/user/private/files", formData);
        if (response?.success) {
            loadFiles();
            return { success: true };
        }
        return { success: false, error: response?.message || "Failed to create item" };
    };

    useImperativeHandle(ref, () => ({
        refresh: () => loadFiles(),
        openUpload: () => uploadInputRef.current?.click(),
        uploadFiles: uploadSelectedFiles,
        createItem
    }), [currentPath]);

    const uploadFiles = async (event) => {
        const selected = Array.from(event.target.files || []);
        if (!selected.length) return;
        await uploadSelectedFiles(selected);
        event.target.value = "";
    };

    const uploadSelectedFiles = async (selected) => {
        const formData = new FormData();
        formData.append("path", currentPath);
        selected.forEach((file) => formData.append("files", file));
        const response = await api.upload("/api/user/private/files", formData);
        if (response?.success) loadFiles();
        else setError(response?.message || "Failed to upload files");
    };

    const unlock = async (action) => {
        setError("");
        const response = await api.post("/api/user/private", { action, type: unlockType, secret });
        if (!response?.success) {
            setError(response?.message || "Unable to unlock Private Disk");
            return;
        }
        setSecret("");
        setStatus({ configured: true, unlocked: true });
        toast?.addSuccess(action === "setup" ? "Private Disk created" : "Private Disk unlocked");
    };

    if (loading) return <div className={styles.loading}><SoftLoading /></div>;
    if (status?.unlocked) return null;

    if (!status?.unlocked) return (
        <div className={styles.content}>
            <div className={styles.setupCard}>
                <LockKeyhole size={28} />
                <h4>{status?.configured ? "Unlock Private Disk" : "Set up Private Disk"}</h4>
                <p className={styles.description}>{status?.configured ? "Enter your unlock value to view this private folder." : "Choose how you want to protect your private folder."}</p>
                {!status?.configured && (
                    <select className={styles.select} value={unlockType} onChange={(event) => setUnlockType(event.target.value)}>
                        <option value="pin">PIN</option>
                        <option value="password">Password</option>
                    </select>
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
