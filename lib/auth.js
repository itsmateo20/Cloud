// lib/auth.js

"use server";

import prisma from "./db";
import { initializeUserFolder } from "./folderAuth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function meetsPasswordRequirements(password) {
    return /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password) &&
        password.length >= 8;
}

export async function signIn(email, password) {
    try {
        if (!email || !password) return { success: false, code: "email_password_missing" };

        if (!meetsPasswordRequirements(password)) return { success: false, code: "password_requirements_false" };

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return { success: false, code: "invalid_credentials" };
        if (!user.provider.includes("credentials")) return { success: false, code: "invalid_credentials" };

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return { success: false, code: "invalid_credentials" };
        await initializeUserFolder(user.id);

        return { success: true, user };
    } catch (error) {
        return { success: false, code: "signin_failed", error };
    }
}

export async function signUp(email, password) {
    try {
        if (!email || !password) return { success: false, code: "email_password_missing" };

        if (!meetsPasswordRequirements(password)) return { success: false, code: "password_requirements_false" };

        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists) return { exists: true, code: "user_already_exists" };
        const googleEmailExists = await prisma.user.findUnique({ where: { googleEmail: email } });
        if (googleEmailExists) return { exists: true, code: "user_already_exists_linked" };

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                provider: "credentials",
                settings: {
                    create: {}
                }
            }
        });
        await initializeUserFolder(user.id);

        return { success: true, user };
    } catch (error) {
        return { success: false, code: "signup_failed", error };
    }
}

export async function signUpWithThirdParty(email, password, type, signature) {
    try {
        if (!email || !password || !signature) return { success: false, code: "email_password_signature_missing" };
        if (type !== "google") return { success: false, code: "invalid_type" };

        if (!meetsPasswordRequirements(password)) return { success: false, code: "password_requirements_false" };

        const emailValidation = await validateEmail(email, signature);
        if (!emailValidation.success) return { success: false, code: emailValidation.code };

        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists) return { exists: true, code: "user_already_exists" };

        if (type === "google") {
            const thirdPartyEmailExists = await prisma.user.findUnique({ where: { googleEmail: email } });
            if (thirdPartyEmailExists) return { exists: true, code: "user_already_exists_linked" };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let user;

        if (type === "google") {
            user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    googleEmail: email,
                    provider: "credentials+google",
                    settings: {
                        create: {}
                    }
                }
            });
        }
        if (user) await initializeUserFolder(user.id);

        return { success: true, user };
    } catch (error) { return { success: false, code: "signup_failed", error }; }
}

export async function authenticationWithGoogle(email, type) {
    if (!email) return { success: false, code: "email_missing" };

    try {
        const userByGoogleEmail = await prisma.user.findFirst({ where: { googleEmail: email } });
        const userByEmail = await prisma.user.findFirst({ where: { email } });

        if (userByGoogleEmail) return { success: true, user: userByGoogleEmail };

        if (type === "signup" && userByEmail) {
            if (!userByEmail.provider.includes("google")) return { success: false, code: "user_already_exists_link_google" };
            else return { success: false, code: "user_already_exists_linked" };
        }

        return { success: false, code: "user_not_found" };

    } catch (error) { return { success: false, code: "authentication_failed", error }; }
}

export async function validateEmail(email, signature) {
    try {
        if (!email || !signature) return { success: false, code: "email_signature_missing" };

        const hmac = crypto.createHmac("sha256", process.env.AUTH_SECRET);
        hmac.update(email);
        const hash = hmac.digest("hex");

        return { success: hash === signature };
    } catch (error) {
        return { success: false, error };
    }
}

export async function linkAccount(googleEmail, email, password, type) {
    try {
        if (!email || !password) return { success: false, code: "email_password_missing" };
        if (!meetsPasswordRequirements(password)) return { success: false, code: "password_requirements_false" };

        const user = await prisma.user.findFirst({ where: { email } });
        if (!user) return { success: false, code: "invalid_credentials" };

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return { success: false, code: "invalid_credentials" };

        if (type === "google") {
            if (user.provider.includes(type)) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleEmail: googleEmail
                    }
                });
                user.googleEmail = googleEmail;
            } else if (!user.provider.includes(type)) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleEmail: googleEmail,
                        provider: `${user.provider}+${type}`
                    }
                });
                user.googleEmail = googleEmail;
                user.provider = `${user.provider}+${type}`;
            }
        } else if (type === "credentials") {
            if (user.provider.includes("google")) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        provider: `${user.provider}+${type}`
                    }
                });
                user.provider = `${user.provider}+${type}`;
            }
        } else return { success: false, code: "invalid_type" };

        return { success: true, user };
    } catch (error) {
        return { success: false, code: "link_account_failed", error };
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
        return null;
    }
}