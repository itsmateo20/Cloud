// lib/auth.js
"use server";

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function signIn(email, password) {
    try {
        if (!email || !password) return { success: false, code: "email_password_missing" };

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return { success: false, code: "invalid_credentials" };
        if (!user.provider.includes("credentials")) return { success: false, code: "invalid_credentials" };

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return { success: false, code: "invalid_credentials" };

        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function signUp(email, password) {
    try {
        if (!email || !password) return { success: false, code: "email_password_missing" };

        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists) return { exists: true, code: "user_already_exists" };

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                provider: "credentials"
            }
        });

        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}


export async function authenticationWithGoogle(email) {
    try {
        if (!email) return { success: false, message: "email_missing" };

        const userExists = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { googleEmail: email }
                ]
            }
        });

        if (userExists) {
            if (userExists.provider.includes("google")) return { success: true, user: userExists };
            else if (userExists.provider === "credentials") return { success: false, code: "user_already_exists_connect_google", googleEmail: email };
        }

        const user = await prisma.user.create({
            data: {
                email: email,
                googleEmail: email,
                provider: "google"
            }
        });
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function validateEmail(email, signature) {
    try {
        if (!email || !signature) return { success: false, code: "email_signature_missing" };

        const hmac = crypto.createHmac("sha256", process.env.AUTH_SECRET);
        hmac.update(email);
        const hash = hmac.digest("hex");
        return { success: hash === signature };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function connectAccount(email, password, type) {
    try {
        if (!email || !password) return { success: false, code: "email_password_missing" };

        const user = await prisma.user.findFirst({ where: { email } });
        if (!user) return { success: false, code: "invalid_credentials" };
        if (user.provider.includes(type)) return { success: false, code: "provider_already_connected" };

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return { success: false, code: "invalid_credentials" };

        if (user.provider.includes("credentials")) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    googleEmail: email,
                    provider: `${user.provider}+${type}`,
                }
            });
        }

        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}


export async function getUserData(userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });
        if (!user) return null;

        return user;
    } catch (error) {
        console.error("Error fetching user data from database:", error);
        return null;
    }
}