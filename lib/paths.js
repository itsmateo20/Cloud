// lib/paths.js
// Utility for configurable file paths

import path from 'path';
import fs from 'fs/promises';

/**
 * Get the base upload folder path from environment variable
 * @returns {string} The upload folder path
 */
export function getUploadFolder() {
    return process.env.UPLOAD_FOLDER || 'uploads';
}

/**
 * Get the full base upload directory path (without user ID)
 * @returns {string} Full path to the base upload directory
 */
export function getUploadBasePath() {
    return path.join(process.cwd(), getUploadFolder());
}

/**
 * Ensure the base upload directory exists
 * @returns {Promise<{success: boolean, path: string, error?: string}>}
 */
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

/**
 * Resolve the base temporary directory used for chunked uploads.
 * If TEMP_FOLDER is set and absolute, use it as-is.
 * If TEMP_FOLDER is set and relative, resolve it from process.cwd().
 * Otherwise default to a hidden ".temp" directory under the upload base path.
 * @returns {string} Absolute path to temp base directory
 */
export function getTempBasePath() {
    const cfg = process.env.TEMP_FOLDER;
    if (cfg && cfg.trim()) {
        return path.isAbsolute(cfg) ? cfg : path.join(process.cwd(), cfg);
    }
    // Default colocated with uploads
    return path.join(getUploadBasePath(), '.temp');
}

/**
 * Ensure the temp base directory exists
 * @returns {Promise<{success: boolean, path: string, error?: string}>}
 */
export async function ensureTempBasePath() {
    const basePath = getTempBasePath();
    try {
        await fs.mkdir(basePath, { recursive: true });
        return { success: true, path: basePath };
    } catch (error) {
        return { success: false, path: basePath, error: error.message };
    }
}

/**
 * Get the temp directory for a specific upload token
 * @param {string} token
 * @returns {string}
 */
export function getTempDirForToken(token) {
    return path.join(getTempBasePath(), token);
}

/**
 * Get the full path to user's upload folder
 * @param {string|number} userId - The user ID
 * @returns {string} Full path to user's upload folder
 */
export function getUserUploadPath(userId) {
    return path.join(getUploadBasePath(), String(userId));
}

/**
 * Ensure the user's upload directory exists
 * @param {string|number} userId - The user ID
 * @returns {Promise<{success: boolean, path: string, error?: string}>}
 */
export async function ensureUserUploadPath(userId) {
    const userPath = getUserUploadPath(userId);
    try {
        // First ensure base path exists
        const baseResult = await ensureUploadBasePath();
        if (!baseResult.success) {
            return baseResult;
        }

        // Then ensure user path exists
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

/**
 * Get the full path to a file within user's upload folder
 * @param {string|number} userId - The user ID
 * @param {string} filePath - Relative path within user's folder
 * @returns {string} Full path to the file
 */
export function getUserFilePath(userId, filePath = '') {
    return path.join(getUserUploadPath(userId), filePath);
}

/**
 * Get the URL path for accessing user files
 * @param {string|number} userId - The user ID
 * @param {string} filePath - Relative path within user's folder
 * @returns {string} URL path for the file
 */
export function getUserFileUrl(userId, filePath = '') {
    const uploadFolder = getUploadFolder();
    return `/${uploadFolder}/${String(userId)}/${filePath}`;
}