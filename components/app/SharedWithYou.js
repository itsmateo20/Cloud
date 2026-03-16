"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Link2, LogOut } from "lucide-react";
import SoftLoading from "@/components/SoftLoading";
import { api } from "@/utils/api";
import styles from "./SharedWithYou.module.css";

function encodePasscodeForQuery(passcode) {
    const value = String(passcode || "");
    if (!value) return "";

    try {
        const bytes = new TextEncoder().encode(value);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 1) {
            binary += String.fromCharCode(bytes[i]);
        }

        return btoa(binary)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
    } catch {
        return encodeURIComponent(value);
    }
}

function createPasscodeQuery(passcode) {
    const encoded = encodePasscodeForQuery(passcode);
    return encoded ? `?pc=${encodeURIComponent(encoded)}` : "";
}

export default function SharedWithYou({ toast }) {
    const [loading, setLoading] = useState(true);
    const [shares, setShares] = useState([]);
    const [selectedShareId, setSelectedShareId] = useState(null);
    const [selectedShareData, setSelectedShareData] = useState(null);
    const [loadingSelected, setLoadingSelected] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [passcodeInput, setPasscodeInput] = useState("");
    const [passcodesByShareId, setPasscodesByShareId] = useState({});

    const selectedShareMeta = useMemo(
        () => shares.find((share) => Number(share.id) === Number(selectedShareId)) || null,
        [shares, selectedShareId]
    );

    const loadSharedWithYou = useCallback(async () => {
        setLoading(true);
        const response = await api.get("/api/shares/shared-with-you");
        if (!response?.success) {
            setLoading(false);
            setShares([]);
            setLoadError(response?.message || "Failed to load shares shared with you");
            return;
        }

        const nextShares = response.shares || [];
        setShares(nextShares);
        setLoadError("");

        if (nextShares.length === 0) {
            setSelectedShareId(null);
            setSelectedShareData(null);
            setPasscodeInput("");
            setLoading(false);
            return;
        }

        const stillSelected = nextShares.some((share) => Number(share.id) === Number(selectedShareId));
        if (!stillSelected) {
            setSelectedShareId(nextShares[0].id);
            setSelectedShareData(null);
            setPasscodeInput("");
        }

        setLoading(false);
    }, [selectedShareId]);

    useEffect(() => {
        loadSharedWithYou();
    }, [loadSharedWithYou]);

    const loadSelectedShare = useCallback(async (share, passcode = "") => {
        if (!share?.token) return;
        setLoadingSelected(true);

        const query = createPasscodeQuery(passcode);
        const response = await api.get(`/api/shares/access/${share.token}${query}`);

        if (!response?.success) {
            setSelectedShareData(null);
            if (response?.code === "share_passcode_required" || response?.code === "share_passcode_invalid") {
                setPasscodesByShareId((prev) => {
                    const next = { ...prev };
                    delete next[share.id];
                    return next;
                });
            }
            setLoadingSelected(false);
            setLoadError(response?.message || "Failed to load selected share");
            return;
        }

        setSelectedShareData(response.share);
        setLoadError("");
        setLoadingSelected(false);
    }, []);

    const selectedPasscode = useMemo(
        () => (selectedShareMeta ? passcodesByShareId[selectedShareMeta.id] || "" : ""),
        [passcodesByShareId, selectedShareMeta]
    );

    useEffect(() => {
        if (!selectedShareMeta) return;
        setLoadError("");

        if (selectedShareMeta.hasPasscode) {
            if (!selectedPasscode) {
                setSelectedShareData(null);
                setPasscodeInput("");
                return;
            }
            loadSelectedShare(selectedShareMeta, selectedPasscode);
            return;
        }

        loadSelectedShare(selectedShareMeta, "");
    }, [selectedShareMeta, selectedPasscode, loadSelectedShare]);

    const leaveShare = async (shareId) => {
        const response = await api.post(`/api/shares/shared-with-you/${shareId}/leave`, {});
        if (!response?.success) {
            toast?.addError(response?.message || "Failed to leave share");
            return;
        }

        toast?.addSuccess("You left this share");
        if (Number(selectedShareId) === Number(shareId)) {
            setSelectedShareId(null);
            setSelectedShareData(null);
            setPasscodeInput("");
        }
        await loadSharedWithYou();
    };

    return (
        <div className={styles.shared}>
            <div className={styles.sharedHeader}>
                <h3>Shared with you</h3>
            </div>

            <div className={styles.sharedContent}>
                <aside className={styles.sharedSidebar}>
                    {loading ? (
                        <div className={styles.loadingCenter}><SoftLoading /></div>
                    ) : shares.length === 0 ? (
                        <p className={styles.emptyHint}>No shares are assigned to your email.</p>
                    ) : (
                        shares.map((share) => (
                            <div key={share.id} className={`${styles.shareRow} ${Number(selectedShareId) === Number(share.id) ? styles.shareRowActive : ""}`}>
                                <button type="button" className={styles.shareRowMain} onClick={() => setSelectedShareId(share.id)}>
                                    <span className={styles.shareRowTitle}>{share.name}</span>
                                    <span className={styles.shareRowMeta}>{share.itemCount} item(s){share.hasPasscode ? " • passcode" : ""}</span>
                                </button>
                                <button type="button" className={styles.iconButton} onClick={() => leaveShare(share.id)} title="Leave share">
                                    <LogOut size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </aside>

                <section className={styles.sharedMainContent}>
                    {!selectedShareMeta ? (
                        <p className={styles.emptyHint}>Select a share to view or download files.</p>
                    ) : selectedShareMeta.hasPasscode && !selectedPasscode ? (
                        <div className={styles.passcodePanel}>
                            <h4>{selectedShareMeta.name}</h4>
                            <p className={styles.emptyHint}>This share is passcode protected.</p>
                            {loadError && <p className={styles.errorText}>{loadError}</p>}
                            <input
                                type="password"
                                className={styles.input}
                                value={passcodeInput}
                                placeholder="Enter passcode"
                                onChange={(e) => setPasscodeInput(e.target.value)}
                            />
                            <button
                                type="button"
                                className={styles.primaryButton}
                                onClick={() => {
                                    const next = String(passcodeInput || "").trim();
                                    if (!next) return;
                                    setPasscodesByShareId((prev) => ({ ...prev, [selectedShareMeta.id]: next }));
                                }}
                            >
                                Unlock share
                            </button>
                        </div>
                    ) : loadingSelected ? (
                        <div className={styles.loadingCenter}><SoftLoading /></div>
                    ) : !selectedShareData ? (
                        <p className={styles.emptyHint}>{loadError || "Unable to load this share."}</p>
                    ) : (
                        <>
                            <div className={styles.mainHeaderRow}>
                                <div>
                                    <h4>{selectedShareData.name}</h4>
                                    <p className={styles.metaLine}>
                                        {selectedShareData.expiresAt ? `Expires ${new Date(selectedShareData.expiresAt).toLocaleString()}` : "No expiration"}
                                    </p>
                                </div>
                                <a
                                    href={`/api/shares/access/${selectedShareData.token}/download-all${createPasscodeQuery(selectedPasscode)}`}
                                    className={styles.secondaryButton}
                                >
                                    <Download size={15} /> Download all
                                </a>
                            </div>

                            <div className={styles.itemsList}>
                                {(selectedShareData.items || []).length === 0 ? (
                                    <p className={styles.emptyHint}>No downloadable items in this share.</p>
                                ) : (
                                    (selectedShareData.items || []).map((item) => (
                                        <div key={item.id} className={styles.itemRow}>
                                            <div>
                                                <div className={styles.itemTitle}>{item.name}</div>
                                                <div className={styles.itemMeta}>{item.type} • {item.path}</div>
                                            </div>
                                            <a
                                                href={`/api/shares/access/${selectedShareData.token}/download?path=${encodeURIComponent(item.path)}${selectedPasscode ? `&pc=${encodeURIComponent(encodePasscodeForQuery(selectedPasscode))}` : ""}`}
                                                className={styles.secondaryButton}
                                            >
                                                <Link2 size={15} /> Download
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button type="button" className={styles.dangerButton} onClick={() => leaveShare(selectedShareMeta.id)}>
                                <LogOut size={15} /> Remove me from this share
                            </button>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
