// app/api/route.js

import { NextResponse } from "next/server";

export function POST() {
    return NextResponse.json({ success: false, code: "not_implemented" }, { status: 501 });
}

export function GET() {
    return NextResponse.json({ success: false, code: "not_implemented" }, { status: 501 });
}