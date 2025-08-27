// lib/uploadSessionManager.js

import fs from "fs/promises";

class UploadSessionManager {
    constructor() {
        this.sessions = new Map();

        // Clean up expired sessions every hour
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60 * 60 * 1000);
    }

    createSession(uploadToken, sessionData) {
        this.sessions.set(uploadToken, sessionData);
    }

    getSession(uploadToken) {
        return this.sessions.get(uploadToken);
    }

    updateSession(uploadToken, updates) {
        const session = this.sessions.get(uploadToken);
        if (session) {
            Object.assign(session, updates);
        }
        return session;
    }

    deleteSession(uploadToken) {
        const session = this.sessions.get(uploadToken);
        if (session) {
            // Clean up temp directory
            fs.rm(session.tempDir, { recursive: true, force: true }).catch(console.error);
            this.sessions.delete(uploadToken);
        }
        return session;
    }

    cleanupExpiredSessions() {
        const now = new Date();

        for (const [token, session] of this.sessions.entries()) {
            if (now > session.expiresAt) {
                this.deleteSession(token);
            }
        }
    }

    getAllSessions() {
        return Array.from(this.sessions.entries());
    }

    getSessionCount() {
        return this.sessions.size;
    }
}

// Create singleton instance
export const uploadSessionManager = new UploadSessionManager();
