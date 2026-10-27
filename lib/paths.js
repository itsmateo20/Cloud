// lib/paths.js

import path from 'path';
import fs from 'fs/promises';
import { normalizeRelativeUploadPath } from '@/utils/uploadPath';

const UPLOAD_FOLDER = process.env.UPLOAD_FOLDER?.trim() || 'uploads';
const TEMP_FOLDER = process.env.TEMP_FOLDER?.trim() || '';

export function getUploadFolder() {
    return UPLOAD_FOLDER;
}

export function getUploadBasePath() {
    return path.join(/*turbopackIgnore: true*/ process.cwd(), UPLOAD_FOLDER);
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
    if (TEMP_FOLDER) {
        return path.isAbsolute(TEMP_FOLDER) ? TEMP_FOLDER : path.join(/*turbopackIgnore: true*/ process.cwd(), TEMP_FOLDER);
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
    return path.join(getTempBasePath(), /*turbopackIgnore: true*/ token);
}

export function getUserUploadPath(userId) {
    return path.join(getUploadBasePath(), /*turbopackIgnore: true*/ String(userId));
}

export function getUserStoragePath(userId, storage = 'main') {
    const userPath = getUserUploadPath(userId);
    return storage === 'private' ? path.join(userPath, '.private') : userPath;
}

export function normalizeStorageRelativePath(relativePath = '', storage = 'main') {
    const normalizedPath = normalizeRelativeUploadPath(String(relativePath || ''));
    if (storage !== 'private') return normalizedPath;

    return normalizedPath
        .replace(/^\.private\//i, '')
        .replace(/^private\//i, '');
}

export function isPrivateStoragePath(userId, relativePath = '') {
    const userRoot = path.resolve(getUserUploadPath(userId));
    const privateRoot = path.resolve(getUserStoragePath(userId, 'private'));
    const resolved = resolvePathWithinBase(userRoot, relativePath);
    if (!resolved.isInside) return false;

    const relativeToPrivate = path.relative(privateRoot, resolved.resolvedPath);
    return relativeToPrivate === ''
        || (!relativeToPrivate.startsWith(`..${path.sep}`) && !path.isAbsolute(relativeToPrivate));
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
    return path.join(getUserUploadPath(userId), /*turbopackIgnore: true*/ filePath);
}

export function resolvePathWithinBase(basePath, relativePath = '') {
    const normalizedBasePath = path.resolve(basePath);
    const normalizedRelativePath = normalizeRelativeUploadPath(String(relativePath || ''));
    const resolvedPath = normalizedRelativePath
        ? path.resolve(normalizedBasePath, normalizedRelativePath)
        : normalizedBasePath;
    const relative = path.relative(normalizedBasePath, resolvedPath);
    const isInside = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));

    return {
        basePath: normalizedBasePath,
        resolvedPath,
        relativePath: normalizedRelativePath,
        isInside
    };
}

export function resolveUserUploadPath(userId, relativePath = '') {
    return resolvePathWithinBase(getUserUploadPath(userId), relativePath);
}

export function getUserFileUrl(userId, filePath = '') {
    const uploadFolder = getUploadFolder();
    return `/${uploadFolder}/${String(userId)}/${filePath}`;
}