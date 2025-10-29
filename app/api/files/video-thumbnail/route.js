import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { getSession } from '@/lib/session';
import { spawn } from 'child_process';
import { getUserUploadPath } from '@/lib/paths';

/**
 * Extracts first frame (at 0.5s) of a video into cached JPEG thumbnail.
 * Cache location: uploads/{userId}/.thumbnails/<relativePath>.video.jpg
 * If cached and source not newer, returns cached file.
 * Requires ffmpeg available in PATH on the server.
 */
export async function GET(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');
    const sizeParam = (searchParams.get('size') || 'medium').toLowerCase();
    const sizeMap = { small: 96, medium: 128, large: 256 };
    const targetSize = sizeMap[sizeParam] || sizeMap.medium;
    if (!filePath) return NextResponse.json({ error: 'File path is required' }, { status: 400 });

    try {
        const { id: userId } = session.user;
        const userFolder = getUserUploadPath(userId);
        const fullPath = path.join(userFolder, filePath);
        if (!fullPath.startsWith(userFolder)) return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });

        await fs.access(fullPath).catch(() => { throw new Error('NOT_FOUND'); });
        const videoExt = path.extname(fullPath).toLowerCase();
        const allowed = ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.wmv'];
        if (!allowed.includes(videoExt)) return NextResponse.json({ error: 'Unsupported video type' }, { status: 400 });

        const stat = await fs.stat(fullPath);
        const sourceMTimeMs = stat.mtimeMs;
        const etag = `"${sourceMTimeMs}-vthumb-${targetSize}"`;
        const ifNoneMatch = req.headers.get('if-none-match');
        if (ifNoneMatch && ifNoneMatch === etag) return new NextResponse(null, { status: 304, headers: { 'ETag': etag } });

        const rel = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        const thumbsDir = path.join(userFolder, '.thumbnails');
        const outFile = path.join(thumbsDir, `${rel}.video.${targetSize}.jpg`);
        await fs.mkdir(path.dirname(outFile), { recursive: true });

        let useCached = false;
        if (fsSync.existsSync(outFile)) {
            try {
                const tStat = await fs.stat(outFile);
                if (tStat.mtimeMs >= sourceMTimeMs) useCached = true;
            } catch { }
        }

        if (!useCached) {
            await new Promise((resolve, reject) => {
                const args = [
                    '-ss', '0.5',
                    '-i', fullPath,
                    '-frames:v', '1',
                    '-vf', `scale=${targetSize}:-1:force_original_aspect_ratio=decrease`,
                    '-q:v', '4',
                    outFile + '.tmp.jpg'
                ];
                const proc = spawn('ffmpeg', args, { stdio: 'ignore' });
                proc.on('error', reject);
                proc.on('close', async (code) => {
                    if (code !== 0) return reject(new Error('FFMPEG_FAILED'));
                    try {
                        await fs.rename(outFile + '.tmp.jpg', outFile);
                    } catch (e) {
                        return reject(e);
                    }
                    resolve();
                });
            });
        }

        const buf = await fs.readFile(outFile);
        return new NextResponse(buf, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=86400',
                'ETag': etag
            }
        });
    } catch (e) {
        if (e.message === 'NOT_FOUND') return NextResponse.json({ error: 'File not found' }, { status: 404 });
        if (e.message === 'FFMPEG_FAILED') return NextResponse.json({ error: 'Video frame extraction failed' }, { status: 500 });

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
