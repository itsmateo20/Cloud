"use client";

import React from "react";
import styles from "./ShareManager.module.css";
import SoftLoading from "@/components/SoftLoading";
import { Link2, MapPin, Minus, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";

export default function ShareManager({
    shareCreateModal,
    setShareCreateModal,
    createShareSubmit,
    shareManager,
    setShareManager,
    shareManagerModalRef,
    sharesOnly,
    shareRowMenuId,
    setShareRowMenuId,
    shareRowMenuButtonRefs,
    openShareDetails,
    copyShareLink,
    deleteShare,
    saveShareSettings,
    jumpToItemLocation,
    removeItemFromShare,
    clearShareLogs,
    reloadLogs
}) {
    const hasNoShares = !shareManager.loading && shareManager.shares.length === 0;

    return (
        <>
            {shareCreateModal.visible && (
                <div className={styles.createModalOverlay}>
                    <div className={styles.createModal}>
                        <div className={styles.createModalHeader}>
                            <h3>
                                {shareCreateModal.stage === "mode"
                                    ? "Share Options"
                                    : shareCreateModal.stage === "append"
                                        ? "Append to Existing Share"
                                        : "Create Share"}
                            </h3>
                            <button className={styles.closeButton} onClick={() => setShareCreateModal(prev => ({ ...prev, visible: false }))}>x</button>
                        </div>
                        <div className={styles.createModalBody}>
                            {shareCreateModal.stage === "mode" && (
                                <div className={styles.shareModeChoiceGrid}>
                                    <button
                                        type="button"
                                        className={styles.shareModeChoiceCard}
                                        onClick={() => setShareCreateModal((prev) => ({ ...prev, mode: "new", stage: "create" }))}
                                    >
                                        <strong>Share</strong>
                                        <span>Create a new share and configure access options.</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.shareModeChoiceCard}
                                        disabled={(shareCreateModal.availableShares || []).length === 0}
                                        onClick={() => setShareCreateModal((prev) => ({ ...prev, mode: "append", stage: "append" }))}
                                    >
                                        <strong>Append to existing share</strong>
                                        <span>
                                            {(shareCreateModal.availableShares || []).length === 0
                                                ? "No active shares available"
                                                : "Add selected items to an existing share"}
                                        </span>
                                    </button>
                                </div>
                            )}

                            {shareCreateModal.stage === "append" && (
                                <>
                                    <label className={styles.shareFieldLabel}>Target Share</label>
                                    <select
                                        className={styles.shareSelect}
                                        value={shareCreateModal.targetShareId}
                                        disabled={(shareCreateModal.availableShares || []).length === 0}
                                        onChange={(e) => setShareCreateModal(prev => ({ ...prev, targetShareId: e.target.value }))}
                                    >
                                        {(shareCreateModal.availableShares || []).length === 0 && <option value="">No shares available</option>}
                                        {(shareCreateModal.availableShares || []).map((share) => (
                                            <option key={share.id} value={share.id}>{share.name}</option>
                                        ))}
                                    </select>
                                </>
                            )}

                            {shareCreateModal.stage === "create" && (
                                <>
                                    <label className={styles.shareFieldLabel}>Share Name</label>
                                    <input
                                        className={styles.shareInput}
                                        value={shareCreateModal.name}
                                        onChange={(e) => setShareCreateModal(prev => ({ ...prev, name: e.target.value }))}
                                    />

                                    <label className={styles.shareCheckboxRow}>
                                        <input
                                            type="checkbox"
                                            checked={shareCreateModal.requireLogin}
                                            onChange={(e) => setShareCreateModal(prev => ({ ...prev, requireLogin: e.target.checked }))}
                                        />
                                        <span>Require login</span>
                                    </label>

                                    {shareCreateModal.requireLogin && (
                                        <>
                                            <label className={styles.shareFieldLabel}>Allowed Emails</label>
                                            <div className={styles.shareEmailEditor}>
                                                {(shareCreateModal.allowedEmails || []).length === 0 ? (
                                                    <p className={styles.shareEmailHint}>No email restrictions added. Use + to add one.</p>
                                                ) : (
                                                    (shareCreateModal.allowedEmails || []).map((email, idx) => (
                                                        <div key={`create-email-${idx}`} className={styles.shareEmailRow}>
                                                            <input
                                                                type="email"
                                                                className={styles.shareInput}
                                                                value={email}
                                                                placeholder="name@example.com"
                                                                onChange={(e) => setShareCreateModal((prev) => {
                                                                    const nextEmails = [...(prev.allowedEmails || [])];
                                                                    nextEmails[idx] = e.target.value;
                                                                    return { ...prev, allowedEmails: nextEmails };
                                                                })}
                                                            />
                                                            <button
                                                                type="button"
                                                                className={styles.shareEmailRemoveButton}
                                                                onClick={() => setShareCreateModal((prev) => {
                                                                    const nextEmails = [...(prev.allowedEmails || [])];
                                                                    nextEmails.splice(idx, 1);
                                                                    return { ...prev, allowedEmails: nextEmails };
                                                                })}
                                                            >
                                                                <Minus size={14} />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                                <button
                                                    type="button"
                                                    className={styles.shareEmailAddButton}
                                                    onClick={() => setShareCreateModal((prev) => ({ ...prev, allowedEmails: [...(prev.allowedEmails || []), ""] }))}
                                                >
                                                    <Plus size={14} /> Add email
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    <label className={styles.shareFieldLabel}>Password / Passcode (optional)</label>
                                    <input
                                        type="password"
                                        className={styles.shareInput}
                                        value={shareCreateModal.passcode}
                                        onChange={(e) => setShareCreateModal(prev => ({ ...prev, passcode: e.target.value }))}
                                        placeholder="Leave blank for no passcode"
                                    />

                                    <div className={styles.shareDurationRow}>
                                        <label className={styles.shareFieldLabel}>Duration</label>
                                        <div className={styles.shareDurationControls}>
                                            {shareCreateModal.durationUnit !== "never" && (
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className={styles.shareInputSmall}
                                                    value={shareCreateModal.durationValue}
                                                    onChange={(e) => setShareCreateModal(prev => ({ ...prev, durationValue: e.target.value }))}
                                                />
                                            )}
                                            <select
                                                className={styles.shareSelect}
                                                value={shareCreateModal.durationUnit}
                                                onChange={(e) => setShareCreateModal(prev => ({ ...prev, durationUnit: e.target.value }))}
                                            >
                                                <option value="never">Never (until canceled)</option>
                                                <option value="hours">Hours</option>
                                                <option value="days">Days</option>
                                                <option value="weeks">Weeks</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className={styles.shareItemsPreview}>
                                        <strong>Items in this share</strong>
                                        <ul>
                                            {shareCreateModal.items.map((item) => (
                                                <li key={`${item.path}-${item.type}`}>{item.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className={styles.createModalFooter}>
                            <button
                                className={styles.shareSecondaryButton}
                                onClick={() => {
                                    if (shareCreateModal.stage === "mode") {
                                        setShareCreateModal(prev => ({ ...prev, visible: false }));
                                        return;
                                    }
                                    setShareCreateModal(prev => ({ ...prev, stage: "mode" }));
                                }}
                            >
                                {shareCreateModal.stage === "mode" ? "Cancel" : "Back"}
                            </button>
                            {shareCreateModal.stage !== "mode" && (
                                <button
                                    className={styles.sharePrimaryButton}
                                    onClick={createShareSubmit}
                                    disabled={
                                        shareCreateModal.submitting ||
                                        (shareCreateModal.stage === "create" && !shareCreateModal.name.trim()) ||
                                        (shareCreateModal.stage === "append" && !shareCreateModal.targetShareId)
                                    }
                                >
                                    {shareCreateModal.submitting
                                        ? (shareCreateModal.stage === "append" ? "Appending..." : "Creating...")
                                        : (shareCreateModal.stage === "append" ? "Append" : "Create Share")}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {shareManager.visible && (
                <div ref={shareManagerModalRef} className={`${styles.shares} ${sharesOnly ? styles.sharesStandalone : ""}`}>
                    <div className={styles.sharesHeader}>
                        <h3>Shared Files</h3>
                    </div>
                    <div className={styles.sharesContent}>
                        {shareManager.loading ? (
                            <div className={styles.shareLoadingCenter}>
                                <SoftLoading />
                            </div>
                        ) : hasNoShares ? (
                            <div className={styles.emptyState}>
                                <p className={styles.emptyStateMessage}>There aren&apos;t any active shares.</p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.sharesSidebar}>
                                    {shareManager.shares.map((share) => (
                                        <div key={share.id} className={`${styles.shareRow} ${shareManager.selectedShare?.id === share.id ? styles.shareRowActive : ""}`}>
                                            <button className={styles.shareRowMain} onClick={() => openShareDetails(share.id)}>
                                                <span className={styles.shareRowTitle}>{share.name}</span>
                                                <span className={styles.shareRowMeta}>{share.itemCount} item(s)</span>
                                            </button>
                                            <div className={styles.shareRowActionsWrap}>
                                                <button
                                                    type="button"
                                                    ref={(el) => {
                                                        if (el) shareRowMenuButtonRefs.current.set(share.id, el);
                                                        else shareRowMenuButtonRefs.current.delete(share.id);
                                                    }}
                                                    className={styles.shareIconButton}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); setShareRowMenuId(prev => prev === share.id ? null : share.id); }}
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {shareRowMenuId === share.id && (
                                                    <div className={styles.shareDropdownMenu} onClick={(e) => e.stopPropagation()}>
                                                        <button onClick={() => { setShareManager(prev => ({ ...prev, editing: true })); setShareRowMenuId(null); }}><Pencil size={14} /> Edit</button>
                                                        <button onClick={() => { copyShareLink(share.token); setShareRowMenuId(null); }}><Link2 size={14} /> Copy Link</button>
                                                        <button className={styles.shareDangerButton} onClick={() => deleteShare(share.id)}><Trash2 size={14} /> Cancel Share</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.sharesMainContent}>
                                    {!shareManager.selectedShare ? (
                                        <p>Select a share to see files and settings.</p>
                                    ) : (
                                        <>
                                            <h4>{shareManager.selectedShare.name}</h4>

                                            {shareManager.editing ? (
                                                <div className={styles.shareEditForm}>
                                                    <label className={styles.shareFieldLabel}>Share Name</label>
                                                    <input className={styles.shareInput} value={shareManager.editForm.name} onChange={(e) => setShareManager(prev => ({ ...prev, editForm: { ...prev.editForm, name: e.target.value } }))} />

                                                    <label className={styles.shareCheckboxRow}>
                                                        <input type="checkbox" checked={shareManager.editForm.requireLogin} onChange={(e) => setShareManager(prev => ({ ...prev, editForm: { ...prev.editForm, requireLogin: e.target.checked } }))} />
                                                        <span>Require login</span>
                                                    </label>

                                                    <label className={styles.shareFieldLabel}>Allowed Emails</label>
                                                    <div className={styles.shareEmailEditor}>
                                                        {(shareManager.editForm.allowedEmails || []).length === 0 ? (
                                                            <p className={styles.shareEmailHint}>No email restrictions added. Use + to add one.</p>
                                                        ) : (
                                                            (shareManager.editForm.allowedEmails || []).map((email, idx) => (
                                                                <div key={`edit-email-${idx}`} className={styles.shareEmailRow}>
                                                                    <input
                                                                        type="email"
                                                                        className={styles.shareInput}
                                                                        value={email}
                                                                        placeholder="name@example.com"
                                                                        onChange={(e) => setShareManager((prev) => {
                                                                            const nextEmails = [...(prev.editForm.allowedEmails || [])];
                                                                            nextEmails[idx] = e.target.value;
                                                                            return { ...prev, editForm: { ...prev.editForm, allowedEmails: nextEmails } };
                                                                        })}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className={styles.shareEmailRemoveButton}
                                                                        onClick={() => setShareManager((prev) => {
                                                                            const nextEmails = [...(prev.editForm.allowedEmails || [])];
                                                                            nextEmails.splice(idx, 1);
                                                                            return { ...prev, editForm: { ...prev.editForm, allowedEmails: nextEmails } };
                                                                        })}
                                                                    >
                                                                        <Minus size={14} />
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                        <button
                                                            type="button"
                                                            className={styles.shareEmailAddButton}
                                                            onClick={() => setShareManager((prev) => ({
                                                                ...prev,
                                                                editForm: { ...prev.editForm, allowedEmails: [...(prev.editForm.allowedEmails || []), ""] }
                                                            }))}
                                                        >
                                                            <Plus size={14} /> Add email
                                                        </button>
                                                    </div>

                                                    <label className={styles.shareFieldLabel}>Set New Passcode</label>
                                                    <input
                                                        type="password"
                                                        className={styles.shareInput}
                                                        value={shareManager.editForm.passcode}
                                                        onChange={(e) => setShareManager(prev => ({ ...prev, editForm: { ...prev.editForm, passcode: e.target.value } }))}
                                                        placeholder="Leave blank to keep current"
                                                    />

                                                    <label className={styles.shareCheckboxRow}>
                                                        <input
                                                            type="checkbox"
                                                            checked={shareManager.editForm.clearPasscode}
                                                            onChange={(e) => setShareManager(prev => ({ ...prev, editForm: { ...prev.editForm, clearPasscode: e.target.checked } }))}
                                                        />
                                                        <span>Remove passcode protection</span>
                                                    </label>

                                                    <div className={styles.shareDurationControls}>
                                                        <input type="number" min="1" className={styles.shareInputSmall} value={shareManager.editForm.durationValue} disabled={shareManager.editForm.durationUnit === "never"} onChange={(e) => setShareManager(prev => ({ ...prev, editForm: { ...prev.editForm, durationValue: e.target.value } }))} />
                                                        <select className={styles.shareSelect} value={shareManager.editForm.durationUnit} onChange={(e) => setShareManager(prev => ({ ...prev, editForm: { ...prev.editForm, durationUnit: e.target.value } }))}>
                                                            <option value="never">Never (until canceled)</option>
                                                            <option value="hours">Hours</option>
                                                            <option value="days">Days</option>
                                                            <option value="weeks">Weeks</option>
                                                        </select>
                                                    </div>

                                                    <div className={styles.shareModalFooterInline}>
                                                        <button className={styles.shareSecondaryButton} onClick={() => setShareManager(prev => ({ ...prev, editing: false }))}>Cancel</button>
                                                        <button className={styles.sharePrimaryButton} onClick={saveShareSettings}>Save</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className={styles.shareInfoLine}>Login required: {shareManager.selectedShare.requireLogin ? "Yes" : "No"}</p>
                                                    <p className={styles.shareInfoLine}>Passcode protected: {shareManager.selectedShare.hasPasscode ? "Yes" : "No"}</p>
                                                    <p className={styles.shareInfoLine}>Expires: {shareManager.selectedShare.expiresAt ? new Date(shareManager.selectedShare.expiresAt).toLocaleString() : "Never"}</p>
                                                    <p className={styles.shareInfoLine}>Allowed users: {(shareManager.selectedShare.allowedEmails || []).length ? shareManager.selectedShare.allowedEmails.join(", ") : "Anyone with link"}</p>
                                                    <button className={styles.shareLinkButton} onClick={() => copyShareLink(shareManager.selectedShare.token)}><Link2 size={15} /> Copy Share Link</button>
                                                </>
                                            )}

                                            <div className={styles.shareItemsSection}>
                                                <h5>Shared Items</h5>
                                                {(shareManager.selectedShare.items || []).map((item) => (
                                                    <div key={item.id} className={styles.shareItemRow}>
                                                        <div>
                                                            <span>{item.name}</span>
                                                            <small>{item.type} • {item.path}</small>
                                                        </div>
                                                        <div className={styles.shareItemButtons}>
                                                            <button className={styles.shareSecondaryButton} onClick={() => jumpToItemLocation(item.path)}>
                                                                <MapPin size={14} /> Show location of file
                                                            </button>
                                                            <button className={styles.shareDangerFlatButton} onClick={() => removeItemFromShare(item.id)}>
                                                                <Trash2 size={14} /> Remove file from sharing
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className={styles.shareLogsSection}>
                                                <div className={styles.shareLogsHeaderRow}>
                                                    <h5>Access Logs</h5>
                                                    <div className={styles.shareLogButtonsRow}>
                                                        <button className={styles.shareSecondaryButton} onClick={clearShareLogs}>Clear Logs</button>
                                                        <button className={styles.shareSecondaryButton} onClick={() => reloadLogs(10)}>show max 10</button>
                                                        <button className={styles.shareSecondaryButton} onClick={() => reloadLogs(50)}>show max 50</button>
                                                        <button className={styles.shareSecondaryButton} onClick={() => reloadLogs(100)}>show max 100</button>
                                                        <button className={styles.shareSecondaryButton} onClick={() => reloadLogs(Math.max(1, Number(shareManager.customLogLimit) || 1))}>show max custom</button>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className={styles.shareInputSmall}
                                                            value={shareManager.customLogLimit}
                                                            onChange={(e) => setShareManager(prev => ({ ...prev, customLogLimit: e.target.value }))}
                                                        />
                                                    </div>
                                                </div>
                                                {(shareManager.logs || []).length === 0 ? (
                                                    <p className={styles.shareInfoLine}>No log entries yet.</p>
                                                ) : (
                                                    <div className={styles.shareLogsList}>
                                                        {shareManager.logs.map((log) => (
                                                            <div key={log.id} className={styles.shareLogRow}>
                                                                <span className={styles.shareLogPrimary}>{new Date(log.createdAt).toLocaleString()} • {log.action} • {log.outcome}</span>
                                                                <span className={styles.shareLogSecondary}>{log.viewerEmail || "anonymous"}{log.itemPath ? ` • ${log.itemPath}` : ""}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
