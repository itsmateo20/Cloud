// lib/session.js
import { prisma } from "./db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const secret = process.env.AUTH_SECRET;

export async function createSession(user) {
    if (!user) return { success: false, code: "invalid_user_data" };

    const token = jwt.sign(user, secret, {
        expiresIn: "30d",
    });

    const cookieStore = await cookies();
    cookieStore.set("auth", token, {
        maxAge: 30 * 24 * 60 * 60,
        secure: process.env.NODE_ENV === "production",
        httpOnly: process.env.NODE_ENV !== "production",
        sameSite: "lax",
        path: "/",
    });

    return { success: true, code: "session_created" };
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth")?.value;
    if (!token) return { success: false, code: "session_not_found" };

    try {
        const user = jwt.verify(token, secret);
        if (!user || (!user.email && !user.googleEmail)) return { success: false, code: "session_invalid" };

        const userExists = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: user.email },
                    { googleEmail: user.googleEmail }
                ]
            }
        });
        if (!userExists) return { success: false, code: "session_user_not_found" };
        return { success: true, code: "session_received", user };
    } catch (error) {
        return { success: false, code: "session_receiving_failed", error: error.message };
    }
}

export async function destroySession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth")?.value;
    if (!token) return { success: false, code: "session_not_found" }

    cookieStore.delete("auth");

    return { success: true, code: "session_destroyed" };
}