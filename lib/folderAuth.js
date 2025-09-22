// lib/folderAuth.js

import { prisma } from "./db.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getUserUploadPath, ensureUserUploadPath } from "./paths.js";

/**
 * Generate a unique folder token
 */
export function generateFolderToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create or update user folder with authentication token
 */
export async function initializeUserFolder(userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, folderToken: true }
        });

        if (!user) {
            throw new Error('User not found');
        }
        let folderToken = user.folderToken;
        if (!folderToken) {
            folderToken = generateFolderToken();
            await prisma.user.update({
                where: { id: userId },
                data: { folderToken }
            });
        }

        // Ensure the user upload directory exists
        const pathResult = await ensureUserUploadPath(userId);
        if (!pathResult.success) {
            throw new Error(`Failed to create upload directory: ${pathResult.error}`);
        }

        const userFolderPath = pathResult.path;
        const userInfoPath = path.join(userFolderPath, 'USRINF.INF');
        const userInfo = {
            id: userId,
            email: user.email,
            folderToken: folderToken,
            createdAt: new Date().toISOString()
        };

        fs.writeFileSync(userInfoPath, JSON.stringify(userInfo, null, 2), 'utf8');

        return { success: true, folderToken };
    } catch (error) {
        console.error('Error initializing user folder:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verify folder ownership by checking token
 */
export async function verifyFolderOwnership(userId) {
    try {
        // Ensure we have the user and, if needed, initialize their folder/token
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, folderToken: true }
        });

        if (!user) {
            return { isValid: false, error: 'User not found' };
        }

        // If folder token is missing, initialize user folder (generates token and creates folder)
        if (!user.folderToken) {
            const init = await initializeUserFolder(userId);
            if (!init.success) {
                return { isValid: false, error: `Failed to initialize user folder: ${init.error}` };
            }
        }

        // Ensure the upload directory exists (create it if missing)
        const ensureResult = await ensureUserUploadPath(userId);
        if (!ensureResult.success) {
            return { isValid: false, error: `Failed to ensure upload path: ${ensureResult.error}` };
        }
        const userFolderPath = ensureResult.path;

        // Ensure the USRINF.INF file exists and is valid; repair if missing/invalid
        const userInfoPath = path.join(userFolderPath, 'USRINF.INF');
        if (!fs.existsSync(userInfoPath)) {
            const init = await initializeUserFolder(userId);
            if (!init.success) {
                return { isValid: false, error: `Failed to create user info file: ${init.error}` };
            }
        }

        // Read and validate user info; if invalid, repair and retry once
        const readAndValidate = () => {
            const content = fs.readFileSync(userInfoPath, 'utf8');
            const info = JSON.parse(content);
            if (info.id !== userId) {
                return { ok: false, error: 'User ID mismatch' };
            }
            // Re-fetch latest token in case it was generated above
            // Note: keeping existing token in user if present
            const tokenToCompare = info.folderToken;
            if (!tokenToCompare || (user.folderToken && tokenToCompare !== user.folderToken)) {
                return { ok: false, error: 'Folder token mismatch' };
            }
            return { ok: true, userInfo: info };
        };

        let validation = null;
        try {
            validation = readAndValidate();
        } catch (e) {
            validation = { ok: false, error: 'Invalid user info file format' };
        }

        if (!validation.ok) {
            const init = await initializeUserFolder(userId);
            if (!init.success) {
                return { isValid: false, error: `Failed to repair user info: ${init.error}` };
            }
            try {
                validation = readAndValidate();
            } catch (e) {
                return { isValid: false, error: 'Invalid user info after repair' };
            }
        }

        return { isValid: true, userInfo: validation.userInfo };
    } catch (error) {
        console.error('Error verifying folder ownership:', error);
        return { isValid: false, error: error.message };
    }
}

/**
 * Repair folder authentication for a user
 */
export async function repairFolderAuth(userId) {
    try {
        const newToken = generateFolderToken();

        await prisma.user.update({
            where: { id: userId },
            data: { folderToken: newToken }
        });

        return await initializeUserFolder(userId);
    } catch (error) {
        console.error('Error repairing folder auth:', error);
        return { success: false, error: error.message };
    }
}
