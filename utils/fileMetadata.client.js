// utils/fileMetadata.client.js
// Client-side file metadata utilities

/**
 * Reads metadata from a File object on the client side
 * @param {File} file - The File object to read metadata from
 * @returns {Object} Metadata object containing available information
 */
export function readFileMetadata(file) {
    const metadata = {
        // Basic file properties
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        lastModifiedDate: file.lastModifiedDate,

        // Convert to ISO strings for transmission
        lastModifiedISO: new Date(file.lastModified).toISOString(),

        // WebkitRelativePath for directory uploads
        webkitRelativePath: file.webkitRelativePath || '',

        // Additional metadata that may be available
        ...(file.lastModifiedDate && {
            lastModifiedDateISO: file.lastModifiedDate.toISOString()
        })
    };

    return metadata;
}

/**
 * Appends metadata to FormData for upload
 * @param {FormData} formData - The FormData object to append to
 * @param {File[]} files - Array of File objects
 */
export function appendMetadataToFormData(formData, files) {
    const metadataArray = files.map(file => readFileMetadata(file));
    formData.append('metadata', JSON.stringify(metadataArray));
}

/**
 * Extracts EXIF data from image files (if available)
 * Note: This requires the browser's File API and may not work in all browsers
 * @param {File} file - Image file to extract EXIF from
 * @returns {Promise<Object>} Promise resolving to EXIF data
 */
export async function extractEXIFData(file) {
    if (!file.type.startsWith('image/')) {
        return null;
    }

    try {
        // For now, we'll return basic image metadata
        // In the future, this could be enhanced with a library like exif-js
        return {
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        };
    } catch (error) {
        console.warn('Failed to extract EXIF data:', error);
        return null;
    }
}