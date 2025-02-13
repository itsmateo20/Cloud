// app/api/auth/login.js

import { signIn } from '@/lib/auth';
import { createSession } from '@/lib/session';

export async function POST(req) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) return new Response(JSON.stringify({ success: false, code: 'missing_email_password' }), { status: 400 });

        const response = await signIn(email, password);

        if (!response.success) return new Response(JSON.stringify({ success: false, code: 'login_error', error: response.message }), { status: 500 });

        await createSession({ id: response.user.id, email: response.user.email, provider: response.user.provider });
        return new Response(JSON.stringify({ success: true, code: 'login_success', user: response.user }), { status: 200, });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, code: 'login_error', error }), { status: 500 });
    }
}