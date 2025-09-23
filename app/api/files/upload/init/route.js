// app/api/files/upload/init/route.js

import { getSession } from "@/lib/session";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import { uploadSessionManager } from "@/lib/uploadSessionManager";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { ensureUserUploadPath, ensureTempBasePath, getTempDirForToken } from "@/lib/paths";

export async function POST(req) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({
                success: false,
                code: 'unauthorized',
                message: 'Authentication required'
            }, { status: 401 });
        }

        const userId = session.user.id;
        const folderVerification = await verifyFolderOwnership(userId);
        if (!folderVerification.isValid) {
            return NextResponse.json({
                success: false,
                code: "folder_auth_failed",
                message: "Folder authentication failed: " + folderVerification.error
            }, { status: 403 });
        }

        const body = await req.json();
        const { fileName, fileSize, chunkCount, currentPath, lastModified } = body;

        if (!fileName || !fileSize || !chunkCount) {
            return NextResponse.json({
                success: false,
                code: 'missing_parameters',
                message: 'Missing required parameters'
            }, { status: 400 });
        }

        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            return NextResponse.json({
                success: false,
                code: 'invalid_filename',
                message: 'Invalid file name'
            }, { status: 400 });
        }

        const pathResult = await ensureUserUploadPath(userId);
        if (!pathResult.success) {
            return NextResponse.json({
                success: false,
                code: 'directory_error',
                message: `Failed to create upload directory: ${pathResult.error}`
            }, { status: 500 });
        }

        const userFolder = pathResult.path;
        const targetDir = currentPath ? path.join(userFolder, currentPath) : userFolder;
        const finalPath = path.join(targetDir, fileName);

        try {
            await fs.mkdir(targetDir, { recursive: true });
        } catch (error) {
            return NextResponse.json({
                success: false,
                code: 'directory_error',
                message: 'Failed to create target directory'
            }, { status: 500 });
        }

        try {
            await fs.access(finalPath);
            return NextResponse.json({
                success: false,
                code: 'file_exists',
                message: 'File already exists'
            }, { status: 409 });
        } catch (error) {
        }

        const uploadToken = crypto.randomUUID();
        const tempBase = await ensureTempBasePath();
        if (!tempBase.success) {
            return NextResponse.json({
                success: false,
                code: 'temp_directory_error',
                message: `Failed to create temp base directory: ${tempBase.error}`
            }, { status: 500 });
        }
        const tempDir = getTempDirForToken(uploadToken);

        try {
            await fs.mkdir(tempDir, { recursive: true });
        } catch (error) {
            return NextResponse.json({
                success: false,
                code: 'temp_directory_error',
                message: 'Failed to create temporary directory'
            }, { status: 500 });
        }

        uploadSessionManager.createSession(uploadToken, {
            userId,
            fileName,
            fileSize,
            chunkCount,
            currentPath,
            lastModified,
            tempDir,
            finalPath,
            uploadedChunks: new Set(),
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        return NextResponse.json({
            success: true,
            uploadToken,
            chunkSize: 25 * 1024 * 1024,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

    } catch (error) {

        return NextResponse.json({
            success: false,
            code: 'internal_error',
            message: 'Failed to initialize upload'
        }, { status: 500 });
    }
}
