// app/account-disabled/page.js
"use client";

import { useState } from "react";
import { api } from "@/utils/api";
import style from "@/public/styles/login.module.css";
import { Download, RotateCcw } from "lucide-react";

export default function AccountDisabledPage() {
    const [email, setEmail] = useState("");
    const [daysRemaining, setDaysRemaining] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [accountInfo, setAccountInfo] = useState(null);

    const checkAccountStatus = async () => {
        if (!email.trim()) {
            setError("Please enter your email");
            return;
        }

        setLoading(true);
        setError("");
        try {
            // This would need a special endpoint to check deletion status by email
            // For now, we'll show a generic message
            setSuccess("Account found. You can cancel the deletion or download your data.");
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
            const response = await api.post('/api/user/cancel-deletion');
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
            const response = await api.post('/api/user/export-data', {
                exportType: 'both'
            });

            if (response instanceof Blob) {
                const url = window.URL.createObjectURL(response);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cloud-export-${new Date().toISOString().split('T')[0]}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setSuccess("Your data has been downloaded!");
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

                {!accountInfo ? (
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

                        <button
                            onClick={checkAccountStatus}
                            disabled={loading}
                            className={style.submitButton}
                        >
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
