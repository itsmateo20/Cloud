// app/api/auth/connect/route.js

import { connectAccount } from "@/lib/auth";

export async function POST(req) {
    try {
        const { email, password, type } = await req.json();
        if (!email || !password || !type) return new Response(JSON.stringify({ success: false, code: 'email_password_type_missing' }), { status: 400 });

        const response = await connectAccount(email, password, type);

        if (!response.success) return new Response(JSON.stringify(response), { status: 500 });

        await createSession(response.user);
        return new Response(JSON.stringify({ success: true, code: 'account_connected', user: response.user }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, code: 'account_connection_error', error }), { status: 500 });
    }
}