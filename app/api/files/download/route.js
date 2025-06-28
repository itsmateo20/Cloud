// api/files/download/route.js

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSession } from '@/lib/session';

export async function GET(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });

    const { id } = session.user;
    const url = new URL(req.url);
    const userFolder = path.join(process.cwd(), "uploads", String(id));
    const requestedPath = path.join(userFolder, url.searchParams.get("path") || "");

    if (!requestedPath.startsWith(userFolder)) return NextResponse.json({ success: false, code: "explorer_invalid_path" }, { status: 400 });

    try {
        const stat = await fs.promises.stat(requestedPath);
        if (stat.isDirectory()) return NextResponse.json({ success: false, code: "explorer_failed_download_folder" }, { status: 400 });

        const stream = fs.createReadStream(requestedPath);
        return new Response(stream, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${path.basename(requestedPath)}"`
            }
        });
    } catch (error) {
        return NextResponse.json({ success: false, code: "explorer_file_invalid", error }, { status: 404 });
    }
}
