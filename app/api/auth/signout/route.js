// app/api/auth/signout/route.js

import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export async function POST() {
    try {
        const session = await destroySession();
        if (!session.success) return NextResponse.json({ success: false, code: "signout_failed", error: session.error }, { status: 500 });

        return NextResponse.json({ success: true, code: "signed_out" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "signout_failed", error }, { status: 500 });
    }
}
