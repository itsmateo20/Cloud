// app/api/auth/validate/route.js

import { validateEmail } from "@/lib/auth";

export async function POST(req) {
    try {
        const { email, signature } = await req.json();
        if (!email || !signature) return new Response(JSON.stringify({ success: false, code: "email_signature_missing" }), { status: 400 });

        const response = await validateEmail(email, signature);

        if (!response.success) return new Response(JSON.stringify(response), { status: 500 });

        return new Response(JSON.stringify({ success: true, code: "email_validated" }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, code: "email_validation_error", error }), { status: 500 });
    }
}