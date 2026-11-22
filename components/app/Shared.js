"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, File, FolderClosed, Grid2X2, List, LogOut } from "lucide-react";
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

function SharedItemVisual({ item, token, passcode, size, variant }) {
    const [thumbnailFailed, setThumbnailFailed] = useState(false);
    const extension = item.name.split(".").pop()?.toLowerCase();
    const isImage = item.type === "file" && ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(extension);

    useEffect(() => {
        setThumbnailFailed(false);
    }, [item.path, passcode, token]);

    if (item.type === "folder") return <FolderClosed size={size} />;
    if (variant !== "tile" || !isImage || thumbnailFailed) return <File size={size} />;

    const encodedPasscode = encodePasscode(passcode);
    const passcodeParam = encodedPasscode ? `&pc=${encodeURIComponent(encodedPasscode)}` : "";
    return (
        <img
            src={withBasePath(`/api/shares/access/${token}/thumbnail?path=${encodeURIComponent(item.path)}&size=medium${passcodeParam}`)}
            alt=""
            className={styles.sharedItemThumbnail}
            loading="lazy"
            decoding="async"
            onError={() => setThumbnailFailed(true)}
        />
    );
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
        <div className={`${styles.shared} ${styles.sharedTabbed}`}>
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
                        <span className={styles.subtabDesktopLabel}>Shared (to you)</span>
                        <span className={styles.subtabMobileLabel}>For you</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={subtab === "by"}
                        className={subtab === "by" ? styles.activeSubtab : ""}
                        onClick={() => setInitialSubtab?.("by")}
                    >
                        <span className={styles.subtabDesktopLabel}>Shared (by you)</span>
                        <span className={styles.subtabMobileLabel}>By you</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={subtab === "access"}
                        className={subtab === "access" ? styles.activeSubtab : ""}
                        onClick={() => setInitialSubtab?.("access")}
                    >
                        <span className={styles.subtabDesktopLabel}>Shared Access</span>
                        <span className={styles.subtabMobileLabel}>Access</span>
                    </button>
                </div>
            </div>

            <div className={styles.sharedBody}>
                {subtab === "to" ? (
                    <SharedToYou toast={toast} viewMode={viewMode} mobile={mobile} onSelectionChange={onSelectionChange} />
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

function SharedToYou({ toast, viewMode = "grid", mobile = false, onSelectionChange }) {
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
    const [browseViewMode, setBrowseViewMode] = useState(viewMode === "list" ? "list" : "grid");
    const [selectedItems, setSelectedItems] = useState([]);
    const itemContainerRef = useRef(null);
    const lastSelectedItemRef = useRef(null);
    const [marqueeRect, setMarqueeRect] = useState(null);

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
            setLoadError(response?.message || "Failed to load shared");
        } else {
            const nextShares = response.shares || [];
            setShares(nextShares);
            setLoadError("");
            if (!nextShares.some((share) => Number(share.id) === Number(selectedShareId))) {
                setSelectedShareId(mobile ? null : nextShares[0]?.id || null);
                setSelectedShareData(null);
            }
        }
        setLoading(false);
    }, [mobile, selectedShareId]);

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

    useEffect(() => {
        setSelectedItems([]);
        lastSelectedItemRef.current = null;
        onSelectionChange?.([]);
    }, [selectedShareId, browsePath]);

    const notifySelection = (next) => {
        onSelectionChange?.(next.map((item) => ({
            ...item,
            __shareToken: selectedShareData?.token,
            __sharePasscode: selectedPasscode
        })));
    };

    const toggleSelectedItem = (item, event) => {
        event?.stopPropagation();
        let next;
        if (event?.ctrlKey || event?.metaKey) {
            next = selectedItems.some((selected) => selected.path === item.path)
                ? selectedItems.filter((selected) => selected.path !== item.path)
                : [...selectedItems, item];
        } else if (event?.shiftKey) {
            const anchor = lastSelectedItemRef.current;
            if (!anchor) {
                next = [item];
            } else {
                const anchorIndex = browseItems.findIndex((candidate) => candidate.path === anchor.path);
                const currentIndex = browseItems.findIndex((candidate) => candidate.path === item.path);
                if (anchorIndex === -1 || currentIndex === -1) next = [item];
                else {
                    const start = Math.min(anchorIndex, currentIndex);
                    const end = Math.max(anchorIndex, currentIndex);
                    next = browseItems.slice(start, end + 1);
                }
            }
        } else {
            next = [item];
        }
        lastSelectedItemRef.current = item;
        setSelectedItems(next);
        notifySelection(next);
    };

    const startMarqueeSelection = (event) => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.target.closest("[data-shared-to-you-item]")) return;
        const container = itemContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const startX = event.clientX - rect.left;
        const startY = event.clientY - rect.top;
        setMarqueeRect({ left: startX, top: startY, width: 0, height: 0 });
        setSelectedItems([]);
        onSelectionChange?.([]);
        lastSelectedItemRef.current = null;
        event.preventDefault();

        const handleMove = (moveEvent) => {
            const currentRect = container.getBoundingClientRect();
            const x = moveEvent.clientX - currentRect.left;
            const y = moveEvent.clientY - currentRect.top;
            const left = Math.min(startX, x);
            const top = Math.min(startY, y);
            const width = Math.abs(x - startX);
            const height = Math.abs(y - startY);
            setMarqueeRect({ left, top, width, height });

            const next = Array.from(container.querySelectorAll("[data-shared-to-you-item]")).reduce((items, element) => {
                const itemRect = element.getBoundingClientRect();
                const intersects = itemRect.left < currentRect.left + left + width &&
                    itemRect.right > currentRect.left + left &&
                    itemRect.top < currentRect.top + top + height &&
                    itemRect.bottom > currentRect.top + top;
                if (intersects) {
                    const path = element.getAttribute("data-shared-to-you-item");
                    const item = browseItems.find((candidate) => candidate.path === path);
                    if (item) items.push(item);
                }
                return items;
            }, []);
            setSelectedItems(next);
            notifySelection(next);
        };

        const handleUp = () => {
            setMarqueeRect(null);
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
    };

    const leaveShare = async (shareId) => {
        const response = await api.post(`/api/shares/shared/${shareId}/leave`, {});
        if (!response?.success) {
            toast?.addError(response?.message || "Failed to leave share");
            return;
        }
        toast?.addSuccess("You left this share");
        await loadShares();
    };

    const mobileShareOpened = mobile && Boolean(selectedMeta);

    return (
        <div className={`${styles.toYouContent} ${mobile ? styles.mobileToYouContent : ""}`}>
            {(!mobile || !mobileShareOpened) && (
                <aside className={styles.sharedSidebar}>
                {loading ? (
                    <div className={styles.loadingCenter}><SoftLoading /></div>
                ) : shares.length === 0 ? (
                    <p className={styles.emptyHint}>{mobile && loadError ? loadError : "No shares are assigned to your email."}</p>
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
            )}

            {(!mobile || mobileShareOpened) && (
            <section className={`${styles.sharedMainContent} ${mobile ? styles.mobileShareContent : ""}`}>
                {mobile && (
                    <div className={styles.mobileDetailHeader}>
                        <button
                            type="button"
                            className={styles.mobileDetailBackButton}
                            onClick={() => {
                                setSelectedShareId(null);
                                setSelectedShareData(null);
                                setBrowsePath("");
                            }}
                        >
                            <ArrowLeft size={18} />
                            <span>All shares</span>
                        </button>
                        <div className={styles.mobileDetailHeading}>
                            <strong>{selectedMeta?.name}</strong>
                            <span>{selectedMeta?.ownerEmail || "Shared with you"}</span>
                        </div>
                    </div>
                )}
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
                                <button type="button" className={browseViewMode === "grid" ? styles.activeViewMode : ""} onClick={() => setBrowseViewMode("grid")}><Grid2X2 size={16} /></button>
                                <button type="button" className={browseViewMode === "list" ? styles.activeViewMode : ""} onClick={() => setBrowseViewMode("list")}><List size={16} /></button>
                            </div>
                        </div>
                        {browsing ? (
                            <div className={styles.loadingCenter}><SoftLoading /></div>
                        ) : browseItems.length === 0 ? (
                            <p className={styles.emptyHint}>This folder is empty.</p>
                        ) : (
                            <div
                                ref={itemContainerRef}
                                className={browseViewMode === "grid" ? styles.itemsGrid : styles.itemsListView}
                                onMouseDown={startMarqueeSelection}
                            >
                                {browseItems.map((item) => (
                                    <div
                                        key={item.id}
                                        data-shared-to-you-item={item.path}
                                        className={`${browseViewMode === "grid" ? styles.itemTile : styles.itemListRow} ${selectedItems.some((selected) => selected.path === item.path) ? styles.selectedSharedItem : ""}`}
                                        onClick={(event) => toggleSelectedItem(item, event)}
                                        onDoubleClick={() => item.type === "folder" && setBrowsePath(item.path)}
                                    >
                                        <button type="button" className={styles.itemOpenButton} onClick={(event) => toggleSelectedItem(item, event)}>
                                            <div className={styles.itemIcon}>
                                                <SharedItemVisual
                                                    item={item}
                                                    token={selectedShareData.token}
                                                    passcode={selectedPasscode}
                                                    size={browseViewMode === "grid" ? (item.type === "folder" ? 42 : 38) : (item.type === "folder" ? 24 : 22)}
                                                    variant={browseViewMode === "grid" ? "tile" : "small"}
                                                />
                                            </div>
                                            <div className={styles.itemTitle}>{item.name}</div>
                                            {browseViewMode === "list" && <div className={styles.itemMeta}>{item.type} • {item.type === "file" ? `${item.size} bytes` : "—"}</div>}
                                        </button>
                                        {item.type === "file" && <a href={withBasePath(`/api/shares/access/${selectedShareData.token}/download?path=${encodeURIComponent(item.path)}${selectedPasscode ? `&pc=${encodeURIComponent(encodePasscode(selectedPasscode))}` : ""}`)} className={styles.itemDownloadButton} onClick={(event) => event.stopPropagation()}><Download size={15} /></a>}
                                    </div>
                                ))}
                                {marqueeRect && (
                                    <div
                                        className={styles.sharedMarqueeSelection}
                                        style={{
                                            left: marqueeRect.left,
                                            top: marqueeRect.top,
                                            width: marqueeRect.width,
                                            height: marqueeRect.height
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </>
                )}
            </section>
            )}
        </div>
    );
}
