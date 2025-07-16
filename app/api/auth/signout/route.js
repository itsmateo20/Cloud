// app/api/auth/signout/route.js

import { destroySession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const session = await destroySession();
        if (!session.success) return NextResponse.json({ success: false, code: "signout_failed", error: data.error });

        return NextResponse.json({ success: true, code: "signed_out" });
    } catch (error) {
        return NextResponse.json({ success: false, code: "signout_failed", error });
    }
}
