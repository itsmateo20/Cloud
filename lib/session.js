// lib/session.js
"use server";

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { checkUserExists } from './actions';

const secret = process.env.AUTH_SECRET;

export async function createSession(user) {
    if (!user) return { success: false, code: 'invalid_user_data' };

    const token = jwt.sign(user, secret, {
        expiresIn: '30d',
    });

    const cookieStore = await cookies();
    cookieStore.set('auth', token, {
        maxAge: 30 * 24 * 60 * 60,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });

    return { success: true, code: 'session_created' };
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth')?.value;
    if (!token) return null;

    try {
        const user = jwt.verify(token, secret);
        const userExists = await checkUserExists(user.email, 'email');
        if (!userExists.exists) return { success: false, code: "session_user_not_found" };
        return { success: true, code: "session_received", user };
    } catch (error) {
        return { success: false, code: "session_receiving_error", error: error.message };
    }
}

export async function destroySession() {
    const cookieStore = await cookies();
    cookieStore.delete('auth');
    return { success: true, code: 'session_destroyed' };
}