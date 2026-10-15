// components/app/AdminUsersPanel.js

"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/utils/api";
import { useAuth } from "@/context/AuthProvider";
import styles from "./AdminUsersPanel.module.css";
import ConfirmModal from "./ConfirmModal";
import { Shield, Users, KeyRound, FolderOpen, Save, RefreshCw, ArrowLeftRight, UserPlus, Trash2, Ban } from "lucide-react";

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
    const [signupEnabled, setSignupEnabled] = useState(true);
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [activeView, setActiveView] = useState("overview");
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

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
        api.get("/api/admin/settings").then((response) => {
            if (response?.success) setSignupEnabled(response.settings.signupEnabled);
        });
    }, []);

    const createUser = async () => {
        const response = await api.post("/api/admin/users", { email: newUserEmail, password: newUserPassword });
        if (!response?.success) return setMessage(response?.message || "Failed to create user");
        setMessage("User created");
        setNewUserEmail("");
        setNewUserPassword("");
        setShowCreateUser(false);
        loadUsers();
    };

    const updateUser = async (changes) => {
        if (!selectedUser) return;
        const response = await api.patch(`/api/admin/users/${selectedUser.id}`, changes);
        if (!response?.success) return setMessage(response?.message || "Failed to update user");
        setMessage("User updated");
        loadUsers();
    };

    const removeUser = async () => {
        if (!selectedUser) return;
        const response = await api.delete(`/api/admin/users/${selectedUser.id}`);
        if (!response?.success) return setMessage(response?.message || "Failed to remove user");
        setSelectedUserId(null);
        setShowRemoveConfirm(false);
        setMessage("User removed");
        loadUsers();
    };

    const updateSignupPolicy = async (enabled) => {
        const response = await api.post("/api/admin/settings", { signupEnabled: enabled });
        if (response?.success) setSignupEnabled(enabled);
        else setMessage(response?.message || "Failed to update signup policy");
    };

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
                <h2><Users size={22} /> {activeView === "users" ? "Manage Users" : "Admin Panel"}</h2>
                <div className={styles.headerActions}>
                    {user?.impersonatorId && (
                        <button type="button" onClick={handleStopImpersonation} disabled={impersonating} className={styles.secondaryButton}>
                            <ArrowLeftRight size={16} /> Return To Admin
                        </button>
                    )}
                    {activeView === "users" ? (
                        <>
                            <button type="button" onClick={() => setActiveView("overview")} className={styles.secondaryButton}>Back</button>
                            <button type="button" onClick={loadUsers} disabled={loading} className={styles.secondaryButton}>
                                <RefreshCw size={16} /> Refresh
                            </button>
                            <button type="button" onClick={() => setShowCreateUser((value) => !value)} className={styles.secondaryButton}><UserPlus size={16} /> Create User</button>
                        </>
                    ) : (
                        <button type="button" onClick={() => setActiveView("users")} className={styles.secondaryButton}><Users size={16} /> Manage Users</button>
                    )}
                    <button type="button" onClick={onClose} className={styles.secondaryButton}>Close</button>
                </div>
            </div>

            {activeView === "overview" && (
                <div className={styles.overview}>
                    <div className={styles.card}>
                        <h4>Registration</h4>
                        <p className={styles.cardDescription}>Control whether anyone can create accounts on their own.</p>
                        <label><input type="checkbox" checked={signupEnabled} onChange={(event) => updateSignupPolicy(event.target.checked)} /> Allow public sign up</label>
                    </div>
                </div>
            )}

            {activeView === "users" && showCreateUser && (
                <div className={styles.card}>
                    <h4>Create User</h4>
                    <input value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} placeholder="Email" />
                    <input type="password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} placeholder="Temporary password" />
                    <button type="button" onClick={createUser} className={styles.primaryButton}><UserPlus size={16} /> Create User</button>
                </div>
            )}

            {error && <p className={styles.error}>{error}</p>}
            {message && <p className={styles.message}>{message}</p>}

            {activeView === "users" && <div className={styles.grid}>
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
                                <h4>Account Access</h4>
                                <button type="button" onClick={() => updateUser({ admin: !selectedUser.admin })} className={styles.secondaryButton}><Shield size={16} /> {selectedUser.admin ? "Remove Admin" : "Make Admin"}</button>
                                <button type="button" onClick={() => updateUser({ isDisabled: !selectedUser.isDisabled })} className={styles.secondaryButton}><Ban size={16} /> {selectedUser.isDisabled ? "Enable Account" : "Disable Account"}</button>
                                <button type="button" onClick={() => setShowRemoveConfirm(true)} className={styles.dangerButton}><Trash2 size={16} /> Remove Account</button>
                            </div>

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
            </div>}

            <ConfirmModal
                open={showRemoveConfirm}
                title="Remove Account"
                message={`Remove ${selectedUser?.email || "this user"} and all of their files? This cannot be undone.`}
                confirmLabel="Remove Account"
                cancelLabel="Cancel"
                destructive
                onCancel={() => setShowRemoveConfirm(false)}
                onConfirm={removeUser}
            />
        </div>
    );
}
