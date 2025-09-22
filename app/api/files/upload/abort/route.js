// app/api/files/upload/abort/route.js

import { getSession } from "@/lib/session";
import { uploadSessionManager } from "@/lib/uploadSessionManager";
import { NextResponse } from "next/server";
import fs from "fs/promises";

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

        const body = await req.json();
        const { uploadToken } = body;

        if (!uploadToken) {
            return NextResponse.json({
                success: false,
                code: 'missing_token',
                message: 'Upload token is required'
            }, { status: 400 });
        }

        const uploadSession = uploadSessionManager.getSession(uploadToken);
        if (!uploadSession) {
            return NextResponse.json({
                success: true,
                message: 'Upload session not found or already cleaned up'
            });
        }

        if (uploadSession.userId !== session.user.id) {
            return NextResponse.json({
                success: false,
                code: 'unauthorized',
                message: 'Unauthorized access to upload session'
            }, { status: 403 });
        }

        try {
            uploadSessionManager.deleteSession(uploadToken);

            return NextResponse.json({
                success: true,
                message: 'Upload aborted and cleaned up successfully'
            });

        } catch (cleanupError) {

            uploadSessionManager.deleteSession(uploadToken);

            return NextResponse.json({
                success: true,
                message: 'Upload aborted (some cleanup may have failed)'
            });
        }

    } catch (error) {

        return NextResponse.json({
            success: false,
            code: 'internal_error',
            message: 'Failed to abort upload'
        }, { status: 500 });
    }
}
