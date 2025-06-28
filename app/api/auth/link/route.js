// app/api/auth/link/route.js

import { NextResponse } from "next/server";
import { linkAccount } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(req) {
    try {
        const { googleEmail, email, password, type } = await req.json();
        if (!googleEmail || !email || !password || !type) return NextResponse.json({ success: false, code: "googleEmail_email_password_type_missing" }, { status: 400 });

        const response = await linkAccount(googleEmail, email, password, type);

        if (!response.success) return NextResponse.json(response, { status: 500 });

        await createSession({ id: response.user.id, email, googleEmail, provider: response.user.provider });
        return NextResponse.json({ success: true, code: "account_linked", user: response.user }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "account_linking_error", error }, { status: 500 });
    }
}