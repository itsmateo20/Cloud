import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { getUploadBasePath } from '@/lib/paths';

export async function GET() {
    const uploadBasePath = getUploadBasePath();

    try {
        const stats = await fs.stat(uploadBasePath);

        if (!stats.isDirectory()) {
            return NextResponse.json({
                success: false,
                code: 'storage_root_not_directory',
                message: `The upload folder configured in .env is not a directory: ${uploadBasePath}`,
                uploadBasePath
            }, { status: 500 });
        }

        await fs.access(uploadBasePath);

        return NextResponse.json({
            success: true,
            uploadBasePath
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({
            success: false,
            code: 'storage_root_missing',
            message: `The upload folder configured in .env could not be found or accessed: ${uploadBasePath}`,
            uploadBasePath,
            error: error.message
        }, { status: 500 });
    }
}