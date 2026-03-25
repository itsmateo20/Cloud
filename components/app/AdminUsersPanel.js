"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/utils/api";
import { useAuth } from "@/context/AuthProvider";
import styles from "./AdminUsersPanel.module.css";
import { Shield, Users, KeyRound, FolderOpen, Save, RefreshCw, ArrowLeftRight } from "lucide-react";

const defaultSettings = {
    theme: "device",
    language: "en_US",
    defaultView: "details",
    defaultSort: "name",
    imageQuality: "best",
    uploadQuality: "best",
    thumbnailResolution: "medium",
};

export default function AdminUsersPanel({ onClose }) {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [settings, setSettings] = useState(defaultSettings);
    const [newPassword, setNewPassword] = useState("");
    const [savingSettings, setSavingSettings] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [impersonating, setImpersonating] = useState(false);
    const [message, setMessage] = useState("");

    const selectedUser = useMemo(() => users.find((item) => item.id === selectedUserId) || null, [users, selectedUserId]);

    const loadUsers = async () => {
        setLoading(true);
        setError("");
        const response = await api.get("/api/admin/users");
        if (!response?.success) {
            setError(response?.message || "Failed to load users");
            setLoading(false);
            return;
        }

        setUsers(Array.isArray(response.users) ? response.users : []);
        if (!selectedUserId && response.users?.length > 0) {
            setSelectedUserId(response.users[0].id);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        if (!selectedUser) return;
        setSettings({
            theme: selectedUser.settings?.theme || defaultSettings.theme,
            language: selectedUser.settings?.language || defaultSettings.language,
            defaultView: selectedUser.settings?.defaultView || defaultSettings.defaultView,
            defaultSort: selectedUser.settings?.defaultSort || defaultSettings.defaultSort,
            imageQuality: selectedUser.settings?.imageQuality || defaultSettings.imageQuality,
            uploadQuality: selectedUser.settings?.uploadQuality || defaultSettings.uploadQuality,
            thumbnailResolution: selectedUser.settings?.thumbnailResolution || defaultSettings.thumbnailResolution,
        });
        setNewPassword("");
        setMessage("");
    }, [selectedUser?.id]);

    const handleSaveSettings = async () => {
        if (!selectedUser) return;
        setSavingSettings(true);
        setMessage("");
        const response = await api.post(`/api/admin/users/${selectedUser.id}/settings`, settings);
        setSavingSettings(false);
        if (!response?.success) {
            setMessage(response?.message || "Failed to save settings");
            return;
        }
        setMessage("Settings saved");
        await loadUsers();
    };

    const handleUpdatePassword = async () => {
        if (!selectedUser || !newPassword.trim()) return;
        setSavingPassword(true);
        setMessage("");
        const response = await api.post(`/api/admin/users/${selectedUser.id}/password`, { password: newPassword });
        setSavingPassword(false);
        if (!response?.success) {
            setMessage(response?.message || "Failed to update password");
            return;
        }
        setMessage("Password updated");
        setNewPassword("");
    };

    const handleViewAsUser = async () => {
        if (!selectedUser) return;
        setImpersonating(true);
        setMessage("");
        const response = await api.post("/api/admin/impersonate", { userId: selectedUser.id });
        setImpersonating(false);
        if (!response?.success) {
            setMessage(response?.message || "Failed to open user files");
            return;
        }
        window.location.href = "/";
    };

    const handleStopImpersonation = async () => {
        setImpersonating(true);
        setMessage("");
        const response = await api.post("/api/admin/impersonate/stop", {});
        setImpersonating(false);
        if (!response?.success) {
            setMessage(response?.message || "Failed to restore admin session");
            return;
        }
        window.location.href = "/";
    };

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <h2><Users size={22} /> View Users</h2>
                <div className={styles.headerActions}>
                    {user?.impersonatorId && (
                        <button type="button" onClick={handleStopImpersonation} disabled={impersonating} className={styles.secondaryButton}>
                            <ArrowLeftRight size={16} /> Return To Admin
                        </button>
                    )}
                    <button type="button" onClick={loadUsers} disabled={loading} className={styles.secondaryButton}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button type="button" onClick={onClose} className={styles.secondaryButton}>Close</button>
                </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {message && <p className={styles.message}>{message}</p>}

            <div className={styles.grid}>
                <aside className={styles.userList}>
                    {loading ? (
                        <p>Loading users...</p>
                    ) : users.length === 0 ? (
                        <p>No users found.</p>
                    ) : (
                        users.map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                className={`${styles.userRow} ${selectedUserId === entry.id ? styles.activeUser : ""}`}
                                onClick={() => setSelectedUserId(entry.id)}
                            >
                                <span>{entry.email || entry.googleEmail || `User ${entry.id}`}</span>
                                {entry.admin ? <Shield size={14} /> : null}
                            </button>
                        ))
                    )}
                </aside>

                <section className={styles.editor}>
                    {!selectedUser ? (
                        <p>Select a user to manage.</p>
                    ) : (
                        <>
                            <h3>{selectedUser.email || selectedUser.googleEmail || `User ${selectedUser.id}`}</h3>
                            <p className={styles.meta}>Provider: {selectedUser.provider} | ID: {selectedUser.id}</p>

                            <div className={styles.card}>
                                <h4>User Settings</h4>
                                <div className={styles.fields}>
                                    <label>
                                        Theme
                                        <select value={settings.theme} onChange={(e) => setSettings((prev) => ({ ...prev, theme: e.target.value }))}>
                                            <option value="device">Device</option>
                                            <option value="light">Light</option>
                                            <option value="dark">Dark</option>
                                            <option value="high-contrast">High Contrast</option>
                                        </select>
                                    </label>
                                    <label>
                                        Default View
                                        <select value={settings.defaultView} onChange={(e) => setSettings((prev) => ({ ...prev, defaultView: e.target.value }))}>
                                            <option value="details">Details</option>
                                            <option value="list">List</option>
                                            <option value="tiles">Tiles</option>
                                            <option value="extraLargeIcons">Extra Large Icons</option>
                                            <option value="largeIcons">Large Icons</option>
                                            <option value="mediumIcons">Medium Icons</option>
                                            <option value="smallIcons">Small Icons</option>
                                        </select>
                                    </label>
                                    <label>
                                        Default Sort
                                        <select value={settings.defaultSort} onChange={(e) => setSettings((prev) => ({ ...prev, defaultSort: e.target.value }))}>
                                            <option value="name">Name</option>
                                            <option value="date">Date</option>
                                            <option value="size">Size</option>
                                            <option value="type">Type</option>
                                        </select>
                                    </label>
                                    <label>
                                        Thumbnail Resolution
                                        <select value={settings.thumbnailResolution} onChange={(e) => setSettings((prev) => ({ ...prev, thumbnailResolution: e.target.value }))}>
                                            <option value="high">High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low</option>
                                        </select>
                                    </label>
                                </div>
                                <button type="button" onClick={handleSaveSettings} disabled={savingSettings} className={styles.primaryButton}>
                                    <Save size={16} /> {savingSettings ? "Saving..." : "Save Settings"}
                                </button>
                            </div>

                            <div className={styles.card}>
                                <h4>Reset Password</h4>
                                <label>
                                    New Password
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min 8 chars, upper/lower/number/symbol"
                                    />
                                </label>
                                <button type="button" onClick={handleUpdatePassword} disabled={savingPassword || !newPassword.trim()} className={styles.primaryButton}>
                                    <KeyRound size={16} /> {savingPassword ? "Updating..." : "Update Password"}
                                </button>
                            </div>

                            <div className={styles.card}>
                                <h4>User Files</h4>
                                <button type="button" onClick={handleViewAsUser} disabled={impersonating} className={styles.primaryButton}>
                                    <FolderOpen size={16} /> {impersonating ? "Opening..." : "View Files As This User"}
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
