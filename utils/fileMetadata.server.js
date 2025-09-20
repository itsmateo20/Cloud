// utils/fileMetadata.server.js
// Server-side file metadata utilities

import fs from 'fs/promises';

/**
 * Server-side utility to apply metadata to uploaded files
 * @param {string} filePath - Path to the uploaded file
 * @param {Object} metadata - Metadata object from client
 */
export async function applyFileMetadata(filePath, metadata) {
    if (!metadata || typeof metadata !== 'object') {
        return false;
    }

    try {
        // Apply modification time if available
        if (metadata.lastModified) {
            const modTime = new Date(metadata.lastModified);
            // Set both access time and modification time to the original modification time
            await fs.utimes(filePath, modTime, modTime);
            return true;
        }

        return false;
    } catch (error) {
        console.warn('Failed to apply file metadata:', error);
        return false;
    }
}

/**
 * Enhanced metadata preservation for server-side
 * Attempts to preserve as much metadata as possible
 * @param {string} filePath - Path to the uploaded file
 * @param {Object} metadata - Complete metadata object
 */
export async function preserveFileMetadata(filePath, metadata) {
    if (!metadata || typeof metadata !== 'object') {
        return { success: false, reason: 'No metadata provided' };
    }

    const results = {
        success: false,
        operations: [],
        errors: []
    };

    try {
        // Preserve modification time
        if (metadata.lastModified) {
            try {
                const modTime = new Date(metadata.lastModified);
                // Ensure the date is valid
                if (!isNaN(modTime.getTime())) {
                    await fs.utimes(filePath, modTime, modTime);
                    results.operations.push('modification_time');
                }
            } catch (error) {
                results.errors.push(`Failed to set modification time: ${error.message}`);
            }
        }

        // Future: Add support for extended attributes, EXIF data, etc.
        // This could include:
        // - Setting extended file attributes (on supported systems)
        // - Preserving EXIF data for images
        // - Maintaining creation time (where supported)

        results.success = results.operations.length > 0;
        return results;
    } catch (error) {
        results.errors.push(`Metadata preservation failed: ${error.message}`);
        return results;
    }
}