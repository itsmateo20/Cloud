// utils/fileMetadata.client.js

export function readFileMetadata(file) {
    const metadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        lastModifiedDate: file.lastModifiedDate,

        lastModifiedISO: new Date(file.lastModified).toISOString(),

        webkitRelativePath: file.webkitRelativePath || '',

        ...(file.lastModifiedDate && {
            lastModifiedDateISO: file.lastModifiedDate.toISOString()
        })
    };

    return metadata;
}

export function appendMetadataToFormData(formData, files) {
    const metadataArray = files.map(file => readFileMetadata(file));
    formData.append('metadata', JSON.stringify(metadataArray));
}

export async function extractEXIFData(file) {
    if (!file.type.startsWith('image/')) return null;

    try {
        return {
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        };
    } catch (error) { return null; }
}