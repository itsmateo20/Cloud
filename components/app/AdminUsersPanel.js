// components/app/AdminUsersPanel.js

"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/utils/api";
import { withBasePath } from "@/lib/basePath";
import { useAuth } from "@/context/AuthProvider";
import styles from "./AdminUsersPanel.module.css";
import shareStyles from "./ShareManager.module.css";
import ConfirmModal from "./ConfirmModal";
import { Shield, Users, KeyRound, FolderOpen, Save, RefreshCw, ArrowLeftRight, UserPlus, Trash2, Ban, Share2, Link2, Pencil, MoreVertical, Plus, Minus } from "lucide-react";

const defaultSettings = {
    theme: "device",
    language: "en_US",
    defaultView: "details",
    defaultSort: "name",
    imageQuality: "best",
    uploadQuality: "best",
    thumbnailResolution: "medium",
};

export default function AdminUsersPanel({ onClose, openToken }) {
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
    const [shares, setShares] = useState([]);
    const [selectedShareId, setSelectedShareId] = useState(null);
    const [shareSettings, setShareSettings] = useState({
        name: "",
        requireLogin: false,
        allowedEmails: "",
        passcode: "",
        clearPasscode: false,
        durationValue: "",
        durationUnit: "never"
    });
    const [showRemoveShareConfirm, setShowRemoveShareConfirm] = useState(false);
    const [shareDetails, setShareDetails] = useState(null);
    const [shareRowMenuId, setShareRowMenuId] = useState(null);
    const [editingShare, setEditingShare] = useState(false);

    const selectedUser = useMemo(() => users.find((item) => item.id === selectedUserId) || null, [users, selectedUserId]);
    const selectedShare = useMemo(() => shares.find((item) => item.id === selectedShareId) || null, [shares, selectedShareId]);

    useEffect(() => {
        setActiveView("overview");
        setShowCreateUser(false);
        setShowRemoveConfirm(false);
        setShowRemoveShareConfirm(false);
    }, [openToken]);

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

    const loadShares = async () => {
        setLoading(true);
        setError("");
        const response = await api.get("/api/admin/shares");
        if (!response?.success) {
            setError(response?.message || "Failed to load share links");
            setLoading(false);
            return;
        }
        setShares(Array.isArray(response.shares) ? response.shares : []);
        if (!selectedShareId && response.shares?.length > 0) setSelectedShareId(response.shares[0].id);
        setLoading(false);
    };

    useEffect(() => {
        loadUsers();
        api.get("/api/admin/settings").then((response) => {
            if (response?.success) setSignupEnabled(response.settings.signupEnabled);
        });
    }, []);

    useEffect(() => {
        if (activeView === "shares") loadShares();
    }, [activeView]);

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

    useEffect(() => {
        if (!selectedShare) return;
        const remainingHours = selectedShare.expiresAt
            ? Math.max(1, Math.ceil((new Date(selectedShare.expiresAt).getTime() - Date.now()) / 3600000))
            : "";
        const durationUnit = remainingHours === "" ? "never" : remainingHours % (24 * 7) === 0 ? "weeks" : remainingHours % 24 === 0 ? "days" : "hours";
        const durationValue = remainingHours === "" ? "" : durationUnit === "weeks" ? remainingHours / (24 * 7) : durationUnit === "days" ? remainingHours / 24 : remainingHours;
        setShareSettings({
            name: selectedShare.name || "",
            requireLogin: Boolean(selectedShare.requireLogin),
            allowedEmails: (selectedShare.allowedEmails || []).join(", "),
            passcode: "",
            clearPasscode: false,
            durationValue,
            durationUnit
        });
        setShareDetails(null);
        setEditingShare(false);
        api.get(`/api/admin/shares/${selectedShare.id}`).then((response) => {
            if (response?.success) setShareDetails(response.share);
        });
    }, [selectedShare?.id]);

    const saveShareSettings = async () => {
        if (!selectedShare) return;
        const response = await api.patch(`/api/admin/shares/${selectedShare.id}`, {
            name: shareSettings.name,
            requireLogin: shareSettings.requireLogin,
            allowedEmails: shareSettings.allowedEmails.split(",").map((email) => email.trim()).filter(Boolean),
            passcode: shareSettings.passcode,
            clearPasscode: shareSettings.clearPasscode,
            durationValue: shareSettings.durationValue,
            durationUnit: shareSettings.durationUnit
        });
        if (!response?.success) return setMessage(response?.message || "Failed to update share link");
        setMessage("Share link updated");
        await loadShares();
    };

    const removeShare = async () => {
        if (!selectedShare) return;
        const response = await api.delete(`/api/admin/shares/${selectedShare.id}`);
        if (!response?.success) return setMessage(response?.message || "Failed to remove share link");
        setSelectedShareId(null);
        setShowRemoveShareConfirm(false);
        setMessage("Share link removed");
        await loadShares();
    };

    const copyShareLink = async (token) => {
        const link = `${window.location.origin}${withBasePath(`/shared/${token}`)}`;
        try {
            await navigator.clipboard.writeText(link);
            setMessage("Share link copied");
        } catch {
            setMessage("Failed to copy share link");
        }
    };

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
        window.location.href = withBasePath("/");
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
        window.location.href = withBasePath("/");
    };

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <h2>{activeView === "shares" ? <Share2 size={22} /> : <Users size={22} />} {activeView === "users" ? "Manage Users" : activeView === "shares" ? "Manage Share Links" : "Admin Panel"}</h2>
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
                    ) : activeView === "shares" ? (
                        <>
                            <button type="button" onClick={() => setActiveView("overview")} className={styles.secondaryButton}>Back</button>
                            <button type="button" onClick={loadShares} disabled={loading} className={styles.secondaryButton}><RefreshCw size={16} /> Refresh</button>
                        </>
                    ) : (
                        null
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
                    <button type="button" className={styles.manageUsersCard} onClick={() => setActiveView("users")}>
                        <Users size={24} />
                        <span><strong>Manage Users</strong><small>View accounts, update access, manage settings, or remove users.</small></span>
                    </button>
                    <button type="button" className={styles.manageUsersCard} onClick={() => setActiveView("shares")}>
                        <Share2 size={24} />
                        <span><strong>Manage Share Links</strong><small>View active links, copy them, edit access settings, or remove them.</small></span>
                    </button>
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

            {activeView === "shares" && (
                <div className={shareStyles.sharesContent}>
                    {loading ? (
                        <div className={shareStyles.shareLoadingCenter}><p>Loading share links...</p></div>
                    ) : shares.length === 0 ? (
                        <div className={shareStyles.emptyState}><p className={shareStyles.emptyStateMessage}>There aren&apos;t any active shares.</p></div>
                    ) : (
                        <>
                            <div className={shareStyles.sharesSidebar}>
                                {shares.map((share) => (
                                    <div key={share.id} className={`${shareStyles.shareRow} ${selectedShareId === share.id ? shareStyles.shareRowActive : ""}`}>
                                        <button className={shareStyles.shareRowMain} onClick={() => setSelectedShareId(share.id)}>
                                            <span className={shareStyles.shareRowTitle}>{share.name}</span>
                                            <span className={shareStyles.shareRowMeta}>{share.ownerEmail} · {share.itemCount} item(s)</span>
                                        </button>
                                        <div className={shareStyles.shareRowActionsWrap}>
                                            <button type="button" className={shareStyles.shareIconButton} onClick={() => setShareRowMenuId((value) => value === share.id ? null : share.id)}>
                                                <MoreVertical size={16} />
                                            </button>
                                            {shareRowMenuId === share.id && (
                                                <div className={shareStyles.shareDropdownMenu}>
                                                    <button onClick={() => { setSelectedShareId(share.id); setEditingShare(true); setShareRowMenuId(null); }}><Pencil size={14} /> Edit</button>
                                                    <button onClick={() => { copyShareLink(share.token); setShareRowMenuId(null); }}><Link2 size={14} /> Copy Link</button>
                                                    <button className={shareStyles.shareDangerButton} onClick={() => { setSelectedShareId(share.id); setShowRemoveShareConfirm(true); setShareRowMenuId(null); }}><Trash2 size={14} /> Cancel Share</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className={shareStyles.sharesMainContent}>
                                {!selectedShare ? (
                                    <p>Select a share to see files and settings.</p>
                                ) : (
                                    <>
                                        <h4>{selectedShare.name}</h4>
                                        {editingShare ? (
                                            <div className={shareStyles.shareEditForm}>
                                                <label className={shareStyles.shareFieldLabel}>Share Name</label>
                                                <input className={shareStyles.shareInput} value={shareSettings.name} onChange={(event) => setShareSettings((prev) => ({ ...prev, name: event.target.value }))} />
                                                <label className={shareStyles.shareCheckboxRow}>
                                                    <input type="checkbox" checked={shareSettings.requireLogin} onChange={(event) => setShareSettings((prev) => ({ ...prev, requireLogin: event.target.checked }))} />
                                                    <span>Require login</span>
                                                </label>
                                                <label className={shareStyles.shareFieldLabel}>Allowed Emails</label>
                                                <div className={shareStyles.shareEmailEditor}>
                                                    {(shareSettings.allowedEmails ? shareSettings.allowedEmails.split(",") : []).map((email, index) => (
                                                        <div key={`admin-share-email-${index}`} className={shareStyles.shareEmailRow}>
                                                            <input
                                                                type="email"
                                                                className={shareStyles.shareInput}
                                                                value={email.trim()}
                                                                placeholder="name@example.com"
                                                                onChange={(event) => setShareSettings((prev) => {
                                                                    const emails = prev.allowedEmails.split(",");
                                                                    emails[index] = event.target.value;
                                                                    return { ...prev, allowedEmails: emails.join(",") };
                                                                })}
                                                            />
                                                            <button type="button" className={shareStyles.shareEmailRemoveButton} onClick={() => setShareSettings((prev) => ({ ...prev, allowedEmails: prev.allowedEmails.split(",").filter((_, entryIndex) => entryIndex !== index).join(",") }))}><Minus size={14} /></button>
                                                        </div>
                                                    ))}
                                                    <button type="button" className={shareStyles.shareEmailAddButton} onClick={() => setShareSettings((prev) => ({ ...prev, allowedEmails: prev.allowedEmails ? `${prev.allowedEmails}, ` : " " }))}><Plus size={14} /> Add email</button>
                                                </div>
                                                <label className={shareStyles.shareFieldLabel}>Set New Passcode</label>
                                                <input
                                                    type="password"
                                                    className={shareStyles.shareInput}
                                                    value={shareSettings.passcode}
                                                    onChange={(event) => setShareSettings((prev) => ({ ...prev, passcode: event.target.value }))}
                                                    placeholder="Leave blank to keep current"
                                                />
                                                <label className={shareStyles.shareCheckboxRow}>
                                                    <input
                                                        type="checkbox"
                                                        checked={shareSettings.clearPasscode}
                                                        onChange={(event) => setShareSettings((prev) => ({ ...prev, clearPasscode: event.target.checked }))}
                                                    />
                                                    <span>Remove passcode protection</span>
                                                </label>
                                                <label className={shareStyles.shareFieldLabel}>Share Duration</label>
                                                <div className={shareStyles.shareDurationControls}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className={shareStyles.shareInputSmall}
                                                        value={shareSettings.durationValue}
                                                        disabled={shareSettings.durationUnit === "never"}
                                                        onChange={(event) => setShareSettings((prev) => ({ ...prev, durationValue: event.target.value }))}
                                                    />
                                                    <select
                                                        className={shareStyles.shareSelect}
                                                        value={shareSettings.durationUnit}
                                                        onChange={(event) => setShareSettings((prev) => ({ ...prev, durationUnit: event.target.value }))}
                                                    >
                                                        <option value="never">Never (until canceled)</option>
                                                        <option value="hours">Hours</option>
                                                        <option value="days">Days</option>
                                                        <option value="weeks">Weeks</option>
                                                    </select>
                                                </div>
                                                <div className={shareStyles.shareModalFooterInline}>
                                                    <button className={shareStyles.shareSecondaryButton} onClick={() => setEditingShare(false)}>Cancel</button>
                                                    <button className={shareStyles.sharePrimaryButton} onClick={async () => { await saveShareSettings(); setEditingShare(false); }}><Save size={15} /> Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className={shareStyles.shareInfoLine}>Owner: {selectedShare.ownerEmail}</p>
                                                <p className={shareStyles.shareInfoLine}>Login required: {selectedShare.requireLogin ? "Yes" : "No"}</p>
                                                <p className={shareStyles.shareInfoLine}>Passcode protected: {selectedShare.hasPasscode ? "Yes" : "No"}</p>
                                                <p className={shareStyles.shareInfoLine}>Expires: {selectedShare.expiresAt ? new Date(selectedShare.expiresAt).toLocaleString() : "Never"}</p>
                                                <p className={shareStyles.shareInfoLine}>Allowed users: {(selectedShare.allowedEmails || []).length ? selectedShare.allowedEmails.join(", ") : "Anyone with link"}</p>
                                                <button className={shareStyles.shareLinkButton} onClick={() => copyShareLink(selectedShare.token)}><Link2 size={15} /> Copy Share Link</button>
                                            </>
                                        )}
                                        <div className={shareStyles.shareItemsSection}>
                                            <h5>Shared Items</h5>
                                            {(shareDetails?.items || []).map((item) => <div key={item.id} className={shareStyles.shareItemRow}><div><span>{item.name}</span><small>{item.type} · {item.path}</small></div></div>)}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

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
            <ConfirmModal
                open={showRemoveShareConfirm}
                title="Remove Share Link"
                message={`Remove "${selectedShare?.name || "this share link"}"? Anyone using the link will lose access.`}
                confirmLabel="Remove Share Link"
                cancelLabel="Cancel"
                destructive
                onCancel={() => setShowRemoveShareConfirm(false)}
                onConfirm={removeShare}
            />
        </div>
    );
}
