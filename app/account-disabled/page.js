// app/account-disabled/page.js
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/utils/api";
import style from "@/public/styles/login.module.css";
import { Download, RotateCcw } from "lucide-react";

function AccountDisabledContent() {
    const searchParams = useSearchParams();
    const queryEmail = searchParams.get("email") || "";
    const querySignature = searchParams.get("signature") || "";

    const [email, setEmail] = useState(queryEmail);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [accountInfo, setAccountInfo] = useState(queryEmail ? { email: queryEmail, signature: querySignature } : null);

    useEffect(() => {
        if (queryEmail) {
            setEmail(queryEmail);
            setAccountInfo({ email: queryEmail, signature: querySignature });
        }
    }, [queryEmail, querySignature]);

    const checkAccountStatus = async () => {
        if (!email.trim()) {
            setError("Please enter your email");
            return;
        }

        setLoading(true);
        setError("");
        try {
            setSuccess("If your account is in the deletion window, you can cancel deletion from this page.");
            setAccountInfo({ email });
        } catch (err) {
            setError("Failed to check account status");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelDeletion = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.post('/api/user/cancel-deletion', {
                email: accountInfo?.email || email,
                signature: accountInfo?.signature || querySignature,
            });
            if (response.success) {
                setSuccess("Deletion cancelled! You can now log in to your account.");
            } else {
                setError(response.message || "Failed to cancel deletion");
            }
        } catch (err) {
            setError("Failed to cancel deletion");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadData = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.downloadBlob('/api/user/export-data', {
                exportType: 'both',
                email: accountInfo?.email || email,
                signature: accountInfo?.signature || querySignature,
            });

            if (response?.success && response.blob) {
                const url = window.URL.createObjectURL(response.blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cloud-export-${new Date().toISOString().split('T')[0]}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setSuccess("Your data has been downloaded!");
            } else {
                setError(response?.message || "Failed to download data");
            }
        } catch (err) {
            setError("Failed to download data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={style.container}>
            <div className={style.loginBox}>
                <h1 className={style.title}>Account Disabled</h1>

                <div className={style.disabledMessage}>
                    <p>
                        This account has been disabled and scheduled for deletion.
                    </p>
                    <p>
                        You have 30 days to cancel the deletion or download your data.
                    </p>
                </div>

                {!accountInfo || !accountInfo.signature ? (
                    <div className={style.form}>
                        <div className={style.formGroup}>
                            <label htmlFor="email">Enter your email address:</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className={style.input}
                                disabled={loading}
                                onKeyDown={(e) => e.key === 'Enter' && checkAccountStatus()}
                            />
                        </div>

                        <button onClick={checkAccountStatus} disabled={loading} className={style.submitButton}>
                            {loading ? "Checking..." : "Check Account"}
                        </button>
                    </div>
                ) : (
                    <div className={style.actionButtons}>
                        <button
                            onClick={handleCancelDeletion}
                            disabled={loading}
                            className={style.secondaryButton}
                        >
                            <RotateCcw size={18} />
                            Cancel Deletion
                        </button>

                        <button
                            onClick={handleDownloadData}
                            disabled={loading}
                            className={style.downloadButton}
                        >
                            <Download size={18} />
                            Download My Data
                        </button>
                    </div>
                )}

                {error && <p className={style.error}>{error}</p>}
                {success && <p className={style.success}>{success}</p>}
            </div>
        </div>
    );
}

export default function AccountDisabledPage() {
    return (
        <Suspense fallback={
            <div className={style.container}>
                <div className={style.loginBox}>
                    <h1 className={style.title}>Loading...</h1>
                </div>
            </div>
        }>
            <AccountDisabledContent />
        </Suspense>
    );
}