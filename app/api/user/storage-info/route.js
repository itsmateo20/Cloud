// app/api/user/storage-info/route.js

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });

        const { id: userId } = session.user;

        // Get all files for the user to calculate total storage
        const files = await prisma.file.findMany({
            where: {
                ownerId: userId
            },
            select: {
                size: true
            }
        });

        let totalSize = 0;
        let totalFiles = 0;

        files.forEach(file => {
            if (file.size) {
                totalSize += Number(file.size);
                totalFiles += 1;
            }
        });

        return NextResponse.json({
            success: true,
            totalSize,
            totalFiles
        });

    } catch (error) {
        console.error('Error calculating storage info:', error);
        return NextResponse.json({
            success: false,
            code: "storage_calculation_failed",
            message: "Failed to calculate storage information"
        }, { status: 500 });
    }
}
