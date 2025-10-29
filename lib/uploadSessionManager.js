// lib/uploadSessionManager.js

import fs from "fs/promises";

class UploadSessionManager {
    constructor() {
        this.sessions = new Map(); // token -> { tempDir, expiresAt, lastAccess, ... }
        this.maxSessions = 500; // soft cap to avoid unbounded memory growth
        if (!global.__uploadSessionCleanupInterval) {
            global.__uploadSessionCleanupInterval = setInterval(() => {
                try {
                    this.cleanupExpiredSessions();
                    this.evictIfNeeded();
                } catch { /* ignore cleanup errors */ }
            }, 30 * 60 * 1000); // every 30 minutes
        }
    }

    createSession(uploadToken, sessionData) {
        sessionData.lastAccess = Date.now();
        this.sessions.set(uploadToken, sessionData);
        this.evictIfNeeded();
    }

    getSession(uploadToken) {
        const s = this.sessions.get(uploadToken);
        if (s) s.lastAccess = Date.now();
        return s;
    }

    updateSession(uploadToken, updates) {
        const session = this.sessions.get(uploadToken);
        if (session) {
            Object.assign(session, updates);
            session.lastAccess = Date.now();
        }
        return session;
    }

    deleteSession(uploadToken) {
        const session = this.sessions.get(uploadToken);
        if (session) {
            if (session.tempDir) fs.rm(session.tempDir, { recursive: true, force: true }).catch(() => { });
            this.sessions.delete(uploadToken);
        }
        return session;
    }

    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [token, session] of this.sessions.entries()) {
            if (session.expiresAt && now > new Date(session.expiresAt).getTime()) this.deleteSession(token);
        }
    }

    evictIfNeeded() {
        if (this.sessions.size <= this.maxSessions) return;
        const entries = Array.from(this.sessions.entries());
        entries.sort((a, b) => (a[1].lastAccess || 0) - (b[1].lastAccess || 0));
        const toRemove = Math.ceil(entries.length * 0.1); // evict oldest 10%
        for (let i = 0; i < toRemove; i++) this.deleteSession(entries[i][0]);
    }

    getAllSessions() { return Array.from(this.sessions.entries()); }
    getSessionCount() { return this.sessions.size; }
}

export const uploadSessionManager = global.uploadSessionManager || new UploadSessionManager();
if (!global.uploadSessionManager) global.uploadSessionManager = uploadSessionManager;
