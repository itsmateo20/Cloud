import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyFolderOwnership } from "@/lib/folderAuth";
import fs from "fs";
import path from "path";
import { getUserUploadPath } from "@/lib/paths";

export async function POST(req) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({
                success: false,
                code: "unauthorized"
            }, { status: 401 });
        }

        const { path: filePath, content } = await req.json();

        if (!filePath || content === undefined) {
            return NextResponse.json({
                success: false,
                code: "missing_parameters",
                message: "Path and content are required"
            }, { status: 400 });
        }
        const folderVerification = await verifyFolderOwnership(session.user.id);
        if (!folderVerification.isValid) {
            return NextResponse.json({
                success: false,
                code: "folder_auth_failed",
                message: "Folder authentication failed: " + folderVerification.error
            }, { status: 403 });
        }
        const file = await prisma.file.findFirst({
            where: {
                path: filePath,
                ownerId: session.user.id
            }
        });

        if (!file) {
            return NextResponse.json({
                success: false,
                code: "file_not_found",
                message: "File not found or access denied"
            }, { status: 404 });
        }
        const userFolder = getUserUploadPath(session.user.id);
        const absoluteFilePath = path.join(userFolder, filePath);
        if (!absoluteFilePath.startsWith(userFolder)) {
            return NextResponse.json({
                success: false,
                code: "invalid_path",
                message: "Invalid file path"
            }, { status: 400 });
        }
        if (!fs.existsSync(absoluteFilePath)) {
            return NextResponse.json({
                success: false,
                code: "file_not_found",
                message: "Physical file not found"
            }, { status: 404 });
        }
        fs.writeFileSync(absoluteFilePath, content, 'utf8');
        const stats = fs.statSync(absoluteFilePath);
        await prisma.file.update({
            where: { id: file.id },
            data: {
                size: stats.size,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            message: "File saved successfully",
            size: stats.size
        });

    } catch (error) {

        return NextResponse.json({
            success: false,
            code: "internal_error",
            message: "Failed to save file"
        }, { status: 500 });
    }
}
