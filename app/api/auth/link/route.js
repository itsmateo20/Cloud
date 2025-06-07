// app/api/auth/link/route.js

import { linkAccount } from "@/lib/auth";

export async function POST(req) {
    try {
        const { googleEmail, email, password, type } = await req.json();
        if (!googleEmail || !email || !password || !type) return new Response(JSON.stringify({ success: false, code: 'googleEmail_email_password_type_missing' }), { status: 400 });

        const response = await linkAccount(googleEmail, email, password, type);

        if (!response.success) return new Response(JSON.stringify(response), { status: 500 });

        await createSession(response.user);
        return new Response(JSON.stringify({ success: true, code: 'account_linked', user: response.user }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, code: 'account_linking_error', error }), { status: 500 });
    }
}