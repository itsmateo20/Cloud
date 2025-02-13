// app/api/auth/session/route.js

import { getSession } from '@/lib/session';

export async function POST() {
    const session = await getSession();
    if (!session?.success) return new Response(JSON.stringify({ success: false, code: "not_authenticated" }), { status: 401 });

    return new Response(JSON.stringify({ success: true, session: { success: session.success, code: session.code }, user: session.user }), { status: 200 });
}
