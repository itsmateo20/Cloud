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