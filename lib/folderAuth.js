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

        if (!user) throw new Error('User not found');
        let folderToken = user.folderToken;
        if (!folderToken) {
            folderToken = generateFolderToken();
            await prisma.user.update({
                where: { id: userId },
                data: { folderToken }
            });
        }

        const pathResult = await ensureUserUploadPath(userId);
        if (!pathResult.success) throw new Error(`Failed to create upload directory: ${pathResult.error}`);

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
    } catch (error) { return { success: false, error: error.message }; }
}

/**
 * Verify folder ownership by checking token
 */
export async function verifyFolderOwnership(userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, folderToken: true }
        });

        if (!user) return { isValid: false, error: 'User not found' };

        if (!user.folderToken) {
            const init = await initializeUserFolder(userId);
            if (!init.success) return { isValid: false, error: `Failed to initialize user folder: ${init.error}` };
        }

        const ensureResult = await ensureUserUploadPath(userId);
        if (!ensureResult.success) return { isValid: false, error: `Failed to ensure upload path: ${ensureResult.error}` };
        const userFolderPath = ensureResult.path;

        const userInfoPath = path.join(userFolderPath, 'USRINF.INF');
        if (!fs.existsSync(userInfoPath)) {
            const init = await initializeUserFolder(userId);
            if (!init.success) return { isValid: false, error: `Failed to create user info file: ${init.error}` };
        }

        const readAndValidate = () => {
            const content = fs.readFileSync(userInfoPath, 'utf8');
            const info = JSON.parse(content);
            if (info.id !== userId) {
                return { ok: false, error: 'User ID mismatch' };
            }
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
            if (!init.success) return { isValid: false, error: `Failed to repair user info: ${init.error}` };
            try {
                validation = readAndValidate();
            } catch (e) {
                return { isValid: false, error: 'Invalid user info after repair' };
            }
        }

        return { isValid: true, userInfo: validation.userInfo };
    } catch (error) { return { isValid: false, error: error.message }; }
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
    } catch (error) { return { success: false, error: error.message }; }
}
