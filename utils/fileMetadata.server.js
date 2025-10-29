// utils/fileMetadata.server.js

import fs from 'fs/promises';

export async function applyFileMetadata(filePath, metadata) {
    if (!metadata || typeof metadata !== 'object') return false;

    try {
        if (metadata.lastModified) {
            const modTime = new Date(metadata.lastModified);
            await fs.utimes(filePath, modTime, modTime);
            return true;
        }
        return false;
    } catch (error) { return false; }
}

export async function preserveFileMetadata(filePath, metadata) {
    if (!metadata || typeof metadata !== 'object') return { success: false, reason: 'No metadata provided' };

    const results = {
        success: false,
        operations: [],
        errors: []
    };

    try {
        if (metadata.lastModified) {
            try {
                const modTime = new Date(metadata.lastModified);
                if (!isNaN(modTime.getTime())) {
                    await fs.utimes(filePath, modTime, modTime);
                    results.operations.push('modification_time');
                }
            } catch (error) {
                results.errors.push(`Failed to set modification time: ${error.message}`);
            }
        }

        results.success = results.operations.length > 0;
        return results;
    } catch (error) {
        results.errors.push(`Metadata preservation failed: ${error.message}`);
        return results;
    }
}