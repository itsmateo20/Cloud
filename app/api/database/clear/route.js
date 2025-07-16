// app/api/database/clear/route.js

import { clear } from "@/lib/clearDatabase";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const response = await clear()

        if (!response.success) return NextResponse.json({ success: false, code: "database_failed" })

        return NextResponse.json({ success: true, code: "database_cleared" })
    } catch (error) {
        return NextResponse.json({ success: false, code: "database_failed", error });
    }
}
