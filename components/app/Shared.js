"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, File, FolderClosed, Grid2X2, List, LogOut, TableProperties } from "lucide-react";
import FileList from "./FileList";
import SharedAccessFolders from "./SharedAccessFolders";
import SoftLoading from "@/components/SoftLoading";
import { api } from "@/utils/api";
import { withBasePath } from "@/lib/basePath";
import styles from "./Shared.module.css";

function encodePasscode(passcode) {
    const value = String(passcode || "");
    if (!value) return "";
    try {
        const bytes = new TextEncoder().encode(value);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
        return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    } catch {
        return encodeURIComponent(value);
    }
}

function passcodeQuery(passcode) {
    const encoded = encodePasscode(passcode);
    return encoded ? `?pc=${encodeURIComponent(encoded)}` : "";
}

export default function Shared({
    initialSubtab = "to",
    setInitialSubtab,
    toast,
    fileListRef,
    socket,
    currentPath,
    onFolderDoubleClick,
    onRootLoadError,
    onSelectionChange,
    onFilesUpload,
    onNavigateToFile,
    onProperties,
    sortBy,
    viewMode,
    user,
    mobile,
    thumbnailResolution,
    trashEnabled,
    sharedAccessRef,
    onSharedAccessSelectionChange,
    onSharedAccessReadyChange
}) {
    const subtab = initialSubtab;

    return (
        <div className={styles.shared}>
            <div className={styles.sharedHeader}>
                <h3>Shared</h3>
                <div className={styles.subtabs} role="tablist" aria-label="Shared views">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={subtab === "to"}
                        className={subtab === "to" ? styles.activeSubtab : ""}
                        onClick={() => setInitialSubtab?.("to")}
                    >
                        Shared (to you)
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={subtab === "by"}
                        className={subtab === "by" ? styles.activeSubtab : ""}
                        onClick={() => setInitialSubtab?.("by")}
                    >
                        Shared (by you)
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={subtab === "access"}
                        className={subtab === "access" ? styles.activeSubtab : ""}
                        onClick={() => setInitialSubtab?.("access")}
                    >
                        Shared Access
                    </button>
                </div>
            </div>

            <div className={styles.sharedBody}>
                {subtab === "to" ? (
                    <SharedToYou toast={toast} viewMode={viewMode} />
                ) : subtab === "by" ? (
                    <FileList
                        key={`shared-by-${mobile ? "mobile" : "desktop"}`}
                        ref={fileListRef}
                        socket={socket}
                        currentPath={currentPath}
                        onFolderDoubleClick={onFolderDoubleClick}
                        onRootLoadError={onRootLoadError}
                        onSelectionChange={onSelectionChange}
                        onFilesUpload={onFilesUpload}
                        onNavigateToFile={onNavigateToFile}
                        onProperties={onProperties}
                        sortBy={sortBy}
                        viewMode={viewMode}
                        user={user}
                        mobile={mobile}
                        thumbnailResolution={thumbnailResolution}
                        trashEnabled={trashEnabled}
                        sharesOnly
                    />
                ) : (
                    <SharedAccessFolders ref={sharedAccessRef} toast={toast} viewMode={viewMode} sortBy={sortBy} mobile={mobile} onSelectionChange={onSharedAccessSelectionChange} onReadyChange={onSharedAccessReadyChange} />
                )}
            </div>
        </div>
    );
}

function SharedToYou({ toast, viewMode = "grid" }) {
    const [loading, setLoading] = useState(true);
    const [shares, setShares] = useState([]);
    const [selectedShareId, setSelectedShareId] = useState(null);
    const [selectedShareData, setSelectedShareData] = useState(null);
    const [loadingSelected, setLoadingSelected] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [passcodeInput, setPasscodeInput] = useState("");
    const [passcodes, setPasscodes] = useState({});
    const [browsePath, setBrowsePath] = useState("");
    const [browseItems, setBrowseItems] = useState([]);
    const [browsing, setBrowsing] = useState(false);
    const [browseViewMode, setBrowseViewMode] = useState(viewMode === "details" ? "details" : viewMode === "list" ? "list" : "grid");

    const selectedMeta = useMemo(
        () => shares.find((share) => Number(share.id) === Number(selectedShareId)) || null,
        [shares, selectedShareId]
    );
    const selectedPasscode = selectedMeta ? passcodes[selectedMeta.id] || "" : "";

    const loadShares = useCallback(async () => {
        setLoading(true);
        const response = await api.get("/api/shares/shared");
        if (!response?.success) {
            setShares([]);
            setLoadError(response?.message || "Failed to load shares shared with you");
        } else {
            const nextShares = response.shares || [];
            setShares(nextShares);
            setLoadError("");
            if (!nextShares.some((share) => Number(share.id) === Number(selectedShareId))) {
                setSelectedShareId(nextShares[0]?.id || null);
                setSelectedShareData(null);
            }
        }
        setLoading(false);
    }, [selectedShareId]);

    useEffect(() => {
        loadShares();
    }, [loadShares]);

    const loadSelected = useCallback(async (share, passcode = "") => {
        if (!share?.token) return;
        setLoadingSelected(true);
        const response = await api.get(`/api/shares/access/${share.token}${passcodeQuery(passcode)}`);
        if (!response?.success) {
            setSelectedShareData(null);
            setLoadError(response?.message || "Failed to load selected share");
            if (response?.code === "share_passcode_required" || response?.code === "share_passcode_invalid") {
                setPasscodes((current) => {
                    const next = { ...current };
                    delete next[share.id];
                    return next;
                });
            }
        } else {
            setSelectedShareData(response.share);
            setLoadError("");
        }
        setLoadingSelected(false);
    }, []);

    const loadBrowse = useCallback(async (share, passcode = "", folderPath = "") => {
        if (!share?.token) return;
        setBrowsing(true);
        const query = passcodeQuery(passcode);
        const separator = query ? "&" : "?";
        const response = await api.get(`/api/shares/access/${share.token}/browse${query}${folderPath ? `${separator}path=${encodeURIComponent(folderPath)}` : ""}`);
        setBrowseItems(response?.success ? (response.items || []) : []);
        setBrowsing(false);
    }, []);

    useEffect(() => {
        setBrowsePath("");
        setSelectedShareData(null);
        if (!selectedMeta) return;
        if (selectedMeta.hasPasscode && !selectedPasscode) {
            setPasscodeInput("");
            return;
        }
        loadSelected(selectedMeta, selectedPasscode);
    }, [selectedMeta, selectedPasscode, loadSelected]);

    useEffect(() => {
        if (selectedMeta && selectedShareData) loadBrowse(selectedMeta, selectedPasscode, browsePath);
    }, [selectedMeta, selectedShareData, selectedPasscode, browsePath, loadBrowse]);

    const leaveShare = async (shareId) => {
        const response = await api.post(`/api/shares/shared/${shareId}/leave`, {});
        if (!response?.success) {
            toast?.addError(response?.message || "Failed to leave share");
            return;
        }
        toast?.addSuccess("You left this share");
        await loadShares();
    };

    return (
        <div className={styles.toYouContent}>
            <aside className={styles.sharedSidebar}>
                {loading ? (
                    <div className={styles.loadingCenter}><SoftLoading /></div>
                ) : shares.length === 0 ? (
                    <p className={styles.emptyHint}>No shares are assigned to your email.</p>
                ) : shares.map((share) => (
                    <div key={share.id} className={`${styles.shareRow} ${Number(selectedShareId) === Number(share.id) ? styles.shareRowActive : ""}`}>
                        <button type="button" className={styles.shareRowMain} onClick={() => setSelectedShareId(share.id)}>
                            <span className={styles.shareRowTitle}>{share.name}</span>
                            <span className={styles.shareRowMeta}>{share.itemCount} item(s){share.hasPasscode ? " • passcode" : ""}</span>
                        </button>
                        <button type="button" className={styles.iconButton} onClick={() => leaveShare(share.id)} title="Leave share">
                            <LogOut size={16} />
                        </button>
                    </div>
                ))}
            </aside>

            <section className={styles.sharedMainContent}>
                {!selectedMeta ? (
                    <p className={styles.emptyHint}>Select a share to view or download files.</p>
                ) : selectedMeta.hasPasscode && !selectedPasscode ? (
                    <div className={styles.passcodePanel}>
                        <h4>{selectedMeta.name}</h4>
                        <p className={styles.emptyHint}>This share is passcode protected.</p>
                        {loadError && <p className={styles.errorText}>{loadError}</p>}
                        <input type="password" className={styles.input} value={passcodeInput} placeholder="Enter passcode" onChange={(event) => setPasscodeInput(event.target.value)} />
                        <button type="button" className={styles.primaryButton} onClick={() => {
                            const next = passcodeInput.trim();
                            if (next) setPasscodes((current) => ({ ...current, [selectedMeta.id]: next }));
                        }}>Unlock share</button>
                    </div>
                ) : loadingSelected ? (
                    <div className={styles.loadingCenter}><SoftLoading /></div>
                ) : !selectedShareData ? (
                    <p className={styles.emptyHint}>{loadError || "Unable to load this share."}</p>
                ) : (
                    <>
                        <div className={styles.mainHeaderRow}>
                            <div><h4>{selectedShareData.name}</h4><p className={styles.metaLine}>{selectedShareData.expiresAt ? `Expires ${new Date(selectedShareData.expiresAt).toLocaleString()}` : "No expiration"}</p></div>
                            <div>
                                <button type="button" className={styles.dangerButton} onClick={() => leaveShare(selectedMeta.id)}><LogOut size={15} /> Remove me from this share</button>
                                <a href={withBasePath(`/api/shares/access/${selectedShareData.token}/download-all${passcodeQuery(selectedPasscode)}`)} className={styles.secondaryButton}><Download size={15} /> Download all</a>
                            </div>
                        </div>
                        <div className={styles.browserToolbar}>
                            <div className={styles.breadcrumbRow}>
                                {browsePath && <button type="button" className={styles.backButton} onClick={() => setBrowsePath(browsePath.includes("/") ? browsePath.substring(0, browsePath.lastIndexOf("/")) : "")}><ArrowLeft size={16} /></button>}
                                <button type="button" className={styles.breadcrumbButton} onClick={() => setBrowsePath("")}>{selectedShareData.name}</button>
                                {browsePath.split("/").filter(Boolean).map((segment, index, segments) => (
                                    <button key={`${segment}-${index}`} type="button" className={styles.breadcrumbButton} onClick={() => setBrowsePath(segments.slice(0, index + 1).join("/"))}>/ {segment}</button>
                                ))}
                            </div>
                            <div className={styles.viewModeButtons}>
                                <button type="button" className={browseViewMode === "details" ? styles.activeViewMode : ""} onClick={() => setBrowseViewMode("details")}><TableProperties size={16} /></button>
                                <button type="button" className={browseViewMode === "grid" ? styles.activeViewMode : ""} onClick={() => setBrowseViewMode("grid")}><Grid2X2 size={16} /></button>
                                <button type="button" className={browseViewMode === "list" ? styles.activeViewMode : ""} onClick={() => setBrowseViewMode("list")}><List size={16} /></button>
                            </div>
                        </div>
                        {browsing ? (
                            <div className={styles.loadingCenter}><SoftLoading /></div>
                        ) : browseItems.length === 0 ? (
                            <p className={styles.emptyHint}>This folder is empty.</p>
                        ) : browseViewMode === "details" ? (
                            <div className={styles.detailsView}>
                                <div className={styles.detailsHeader}><span>Name</span><span>Type</span><span>Size</span></div>
                                {browseItems.map((item) => (
                                    <div key={item.id} className={styles.detailsRow} onDoubleClick={() => item.type === "folder" && setBrowsePath(item.path)}>
                                        <button type="button" className={styles.detailsName} onClick={() => item.type === "folder" && setBrowsePath(item.path)}>
                                            {item.type === "folder" ? <FolderClosed size={18} /> : <File size={18} />}<span>{item.name}</span>
                                        </button>
                                        <span>{item.type}</span>
                                        <span>{item.type === "file" ? `${item.size} bytes` : "—"}</span>
                                        {item.type === "file" && <a href={withBasePath(`/api/shares/access/${selectedShareData.token}/download?path=${encodeURIComponent(item.path)}${selectedPasscode ? `&pc=${encodeURIComponent(encodePasscode(selectedPasscode))}` : ""}`)} className={styles.rowDownloadButton}><Download size={15} /></a>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={browseViewMode === "grid" ? styles.itemsGrid : styles.itemsListView}>
                                {browseItems.map((item) => (
                                    <div key={item.id} className={browseViewMode === "grid" ? styles.itemTile : styles.itemListRow} onDoubleClick={() => item.type === "folder" && setBrowsePath(item.path)}>
                                        <button type="button" className={styles.itemOpenButton} onClick={() => item.type === "folder" && setBrowsePath(item.path)}>
                                            <div className={styles.itemIcon}>{item.type === "folder" ? <FolderClosed size={browseViewMode === "grid" ? 42 : 24} /> : <File size={browseViewMode === "grid" ? 38 : 22} />}</div>
                                            <div className={styles.itemTitle}>{item.name}</div>
                                            {browseViewMode === "list" && <div className={styles.itemMeta}>{item.type} • {item.type === "file" ? `${item.size} bytes` : "—"}</div>}
                                        </button>
                                        {item.type === "file" && <a href={withBasePath(`/api/shares/access/${selectedShareData.token}/download?path=${encodeURIComponent(item.path)}${selectedPasscode ? `&pc=${encodeURIComponent(encodePasscode(selectedPasscode))}` : ""}`)} className={styles.itemDownloadButton}><Download size={15} /></a>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
