// lib/paths.js

import path from 'path';
import fs from 'fs/promises';

export function getUploadFolder() {
    return process.env.UPLOAD_FOLDER || 'uploads';
}

export function getUploadBasePath() {
    return path.join(process.cwd(), getUploadFolder());
}

export async function ensureUploadBasePath() {
    const basePath = getUploadBasePath();
    try {
        await fs.mkdir(basePath, { recursive: true });
        return { success: true, path: basePath };
    } catch (error) {
        return {
            success: false,
            path: basePath,
            error: error.message
        };
    }
}

export function getTempBasePath() {
    const cfg = process.env.TEMP_FOLDER;
    if (cfg && cfg.trim()) {
        return path.isAbsolute(cfg) ? cfg : path.join(process.cwd(), cfg);
    }
    return path.join(getUploadBasePath(), '.temp');
}

export async function ensureTempBasePath() {
    const basePath = getTempBasePath();
    try {
        await fs.mkdir(basePath, { recursive: true });
        return { success: true, path: basePath };
    } catch (error) {
        return { success: false, path: basePath, error: error.message };
    }
}

export function getTempDirForToken(token) {
    return path.join(getTempBasePath(), token);
}

export function getUserUploadPath(userId) {
    return path.join(getUploadBasePath(), String(userId));
}

export async function ensureUserUploadPath(userId) {
    const userPath = getUserUploadPath(userId);
    try {
        const baseResult = await ensureUploadBasePath();
        if (!baseResult.success) return baseResult;

        await fs.mkdir(userPath, { recursive: true });
        return { success: true, path: userPath };
    } catch (error) {
        return {
            success: false,
            path: userPath,
            error: error.message
        };
    }
}

export function getUserFilePath(userId, filePath = '') {
    return path.join(getUserUploadPath(userId), filePath);
}

export function getUserFileUrl(userId, filePath = '') {
    const uploadFolder = getUploadFolder();
    return `/${uploadFolder}/${String(userId)}/${filePath}`;
}