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


export async function authenticationWithGoogle(email, type) {
    try {
        if (!email) return { success: false, message: "email_missing" };

        const userExists = await prisma.user.findFirst({ where: { googleEmail: email } });
        const userExistsByEmail = await prisma.user.findFirst({ where: { email } });

        if (userExists && !userExistsByEmail) return { success: true, user: userExists };
        else if (userExists && userExistsByEmail && type === "signup") return { success: false, code: "user_already_exists_linked" };
        else {
            if (userExistsByEmail?.provider.includes("credentials") && type === "login") return { success: false, code: "user_already_exists_link_google" };
            else return { success: false, code: "user_not_found" };
        }

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

export async function linkAccount(googleEmail, email, password, type) {
    try {
        if (!email || !password) {
            return { success: false, code: "email_password_missing" };
        }

        const user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            return { success: false, code: "invalid_credentials" };
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return { success: false, code: "invalid_credentials" };
        }

        if (type === "google") {
            if (user.provider.includes(type)) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleEmail: googleEmail
                    }
                });
            } else if (!user.provider.includes(type)) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleEmail: googleEmail,
                        provider: `${user.provider}+${type}`
                    }
                });
            }
        } else if (type === "credentials") {
            if (user.provider.includes("google")) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        provider: `${user.provider}+${type}`
                    }
                });
            }
        } else {
            return { success: false, code: "invalid_type" };
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