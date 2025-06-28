// app/api/auth/validate/route.js

import { NextResponse } from "next/server";
import { validateEmail } from "@/lib/auth";

export async function POST(req) {
    try {
        const { email, signature } = await req.json();
        if (!email || !signature) return NextResponse.json({ success: false, code: "email_signature_missing" }, { status: 400 });

        const response = await validateEmail(email, signature);

        if (!response.success) return NextResponse.json(response, { status: 500 });

        return NextResponse.json({ success: true, code: "email_validated_success" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "email_validation_failed", error }, { status: 500 });
    }
}