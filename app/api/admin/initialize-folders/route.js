// app/api/admin/initialize-folders/route.js

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { initializeUserFolder } from "@/lib/folderAuth";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({
                success: false,
                code: "unauthorized"
            }, { status: 401 });
        }
        const result = await initializeUserFolder(session.user.id);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: "Folder initialized successfully",
                folderToken: result.folderToken
            });
        } else {
            return NextResponse.json({
                success: false,
                message: "Failed to initialize folder",
                error: result.error
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error initializing folder:', error);
        return NextResponse.json({
            success: false,
            message: "Internal server error"
        }, { status: 500 });
    }
}
