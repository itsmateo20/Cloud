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
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, folderToken: true }
        });

        if (!user || !user.folderToken) {
            return { isValid: false, error: 'User or folder token not found' };
        }
        const userFolderPath = getUserUploadPath(userId);
        if (!fs.existsSync(userFolderPath)) {
            return { isValid: false, error: 'User folder does not exist' };
        }
        const userInfoPath = path.join(userFolderPath, 'USRINF.INF');
        if (!fs.existsSync(userInfoPath)) {
            return { isValid: false, error: 'User info file not found' };
        }
        try {
            const userInfoContent = fs.readFileSync(userInfoPath, 'utf8');
            const userInfo = JSON.parse(userInfoContent);

            if (userInfo.id !== userId) {
                return { isValid: false, error: 'User ID mismatch' };
            }

            if (userInfo.folderToken !== user.folderToken) {
                return { isValid: false, error: 'Folder token mismatch' };
            }

            return { isValid: true, userInfo };
        } catch (parseError) {
            return { isValid: false, error: 'Invalid user info file format' };
        }
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
