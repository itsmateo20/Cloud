export function normalizeRelativeUploadPath(input = '') {
    if (!input || typeof input !== 'string') return '';

    return input
        .replace(/\\/g, '/')
        .replace(/^file:\/+/i, '')
        .replace(/^[a-zA-Z]:/, '')
        .replace(/^\/+/, '')
        .split('/')
        .filter((part) => part && part !== '.' && part !== '..')
        .join('/');
}