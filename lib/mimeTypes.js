// lib/mimeTypes.js

export function getMimeType(filename) {
    const ext = filename.toLowerCase().split('.').pop();

    const mimeTypes = {
        'html': 'text/html',
        'htm': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'xml': 'application/xml',

        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'ico': 'image/x-icon',

        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        'webm': 'video/webm',
        'mkv': 'video/x-matroska',

        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'flac': 'audio/flac',
        'aac': 'audio/aac',

        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

        'zip': 'application/zip',
        'rar': 'application/vnd.rar',
        '7z': 'application/x-7z-compressed',
        'tar': 'application/x-tar',
        'gz': 'application/gzip',

        'py': 'text/x-python',
        'java': 'text/x-java-source',
        'cpp': 'text/x-c++src',
        'c': 'text/x-csrc',
        'php': 'application/x-httpd-php',
        'rb': 'text/x-ruby',
        'go': 'text/x-go',
        'rs': 'text/x-rust',
        'ts': 'application/typescript',
        'jsx': 'text/jsx',
        'vue': 'text/x-vue',

        'ini': 'text/plain',
        'conf': 'text/plain',
        'cfg': 'text/plain',
        'env': 'text/plain',
        'log': 'text/plain',
        'yml': 'application/x-yaml',
        'yaml': 'application/x-yaml',
        'toml': 'application/toml',

        'ttf': 'font/ttf',
        'otf': 'font/otf',
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'eot': 'application/vnd.ms-fontobject'
    };

    return mimeTypes[ext] || 'application/octet-stream';
}

export function isTextFile(filename) {
    const mimeType = getMimeType(filename);
    return mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/javascript' || mimeType === 'application/typescript' || mimeType === 'application/xml' || mimeType === 'application/x-yaml' || mimeType === 'application/toml';
}

export function shouldForceDownload(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const executableExtensions = ['exe', 'msi', 'app', 'deb', 'rpm', 'dmg', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'scr', 'com', 'pif', 'jar'];
    return executableExtensions.includes(ext);
}
