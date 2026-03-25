// lib/session.js
import prisma from "./db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import {
    CLIENT_TOKEN_KIND,
    createClientTokenRecord,
    extractRequestMeta,
    getClientTokenRecord,
    isClientTokenActive,
    revokeClientTokenRecord,
    touchClientTokenRecord
} from "@/lib/clientTokens";

const secret = process.env.AUTH_SECRET;

export async function createSession(user, req = null) {
    if (!user) return { success: false, code: "invalid_user_data" };

    const safeUser = {
        id: user.id,
        email: user.email || null,
        googleEmail: user.googleEmail || null,
        provider: user.provider || "credentials",
        admin: Boolean(user.admin),
        impersonatorId: user.impersonatorId ?? null,
    };

    const requestMeta = extractRequestMeta(req);
    const tokenRecord = await createClientTokenRecord(safeUser.id, {
        kind: CLIENT_TOKEN_KIND.WEB_SESSION,
        label: "Web session",
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
        platform: requestMeta.platform
    });

    const token = jwt.sign({ ...safeUser, tid: tokenRecord.tokenId, typ: "web" }, secret, {
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

        if (!user.tid) {
            return { success: false, code: "session_token_missing_id" };
        }

        const tokenRecord = await getClientTokenRecord(user.id, user.tid);
        if (!tokenRecord || tokenRecord.kind !== CLIENT_TOKEN_KIND.WEB_SESSION) {
            cookieStore.delete("auth");
            return { success: false, code: "token_not_registered" };
        }

        if (!isClientTokenActive(tokenRecord)) {
            cookieStore.delete("auth");
            return { success: false, code: "token_revoked" };
        }

        await touchClientTokenRecord(user.id, user.tid);

        const userExists = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: user.email },
                    { googleEmail: user.googleEmail }
                ]
            },
            select: {
                id: true,
                email: true,
                googleEmail: true,
                provider: true,
                admin: true,
            }
        });
        if (!userExists) return { success: false, code: "session_user_not_found" };

        const hydratedUser = {
            id: userExists.id,
            email: userExists.email,
            googleEmail: userExists.googleEmail,
            provider: userExists.provider,
            admin: Boolean(userExists.admin || user.admin),
            impersonatorId: user.impersonatorId ?? null,
            tid: user.tid,
            typ: user.typ,
        };

        return { success: true, code: "session_received", user: hydratedUser };
    } catch (error) {
        return { success: false, code: "session_receiving_failed", error: error.message };
    }
}

export async function destroySession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth")?.value;
    if (!token) return { success: false, code: "session_not_found" }

    try {
        const user = jwt.verify(token, secret);
        if (user?.id && user?.tid) {
            await revokeClientTokenRecord(user.id, user.tid);
        }
    } catch {
    }

    cookieStore.delete("auth");

    return { success: true, code: "session_destroyed" };
}