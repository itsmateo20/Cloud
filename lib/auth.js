// lib/auth.js

"use server";

import prisma from "./db";
import { initializeUserFolder } from "./folderAuth";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { signAccountDeletionEmail } from "./accountDeletion";

function meetsPasswordRequirements(password) {
    return /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password) &&
        password.length >= 8;
}

const providerEmailFields = {
    google: "googleEmail",
    github: "githubEmail",
    discord: "discordEmail",
};

function getProviderEmailField(type) {
    return providerEmailFields[type] || null;
}

export async function signIn(email, password) {
    try {
        if (!email || !password) return { success: false, code: "email_password_missing" };

        if (!meetsPasswordRequirements(password)) return { success: false, code: "password_requirements_false" };

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return { success: false, code: "invalid_credentials" };
        if (!user.provider.includes("credentials")) return { success: false, code: "invalid_credentials" };
        if (user.isDeleted) {
            return {
                success: false,
                code: "account_deleted",
                email: user.email,
                signature: signAccountDeletionEmail(user.email),
                deletionScheduledAt: user.deletionScheduledAt,
            };
        }
        if (user.isDisabled) return { success: false, code: "account_disabled" };

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
        const providerEmailField = getProviderEmailField(type);
        if (!providerEmailField) return { success: false, code: "invalid_type" };

        if (!meetsPasswordRequirements(password)) return { success: false, code: "password_requirements_false" };

        const emailValidation = await validateEmail(email, signature);
        if (!emailValidation.success) return { success: false, code: emailValidation.code };

        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists) return { exists: true, code: "user_already_exists" };

        const thirdPartyEmailExists = await prisma.user.findUnique({ where: { [providerEmailField]: email } });
        if (thirdPartyEmailExists) return { exists: true, code: "user_already_exists_linked" };

        const hashedPassword = await bcrypt.hash(password, 10);
        let user;

        user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                [providerEmailField]: email,
                provider: `credentials+${type}`,
                settings: {
                    create: {}
                }
            }
        });
        if (user) await initializeUserFolder(user.id);

        return { success: true, user };
    } catch (error) { return { success: false, code: "signup_failed", error }; }
}

export async function authenticationWithProvider(email, type, provider) {
    if (!email) return { success: false, code: "email_missing" };
    const providerEmailField = getProviderEmailField(provider);
    if (!providerEmailField) return { success: false, code: "invalid_type" };

    try {
        const userByProviderEmail = await prisma.user.findFirst({ where: { [providerEmailField]: email } });
        const userByEmail = await prisma.user.findFirst({ where: { email } });

        if (userByProviderEmail) {
            if (userByProviderEmail.isDeleted) {
                return {
                    success: false,
                    code: "account_deleted",
                    email: userByProviderEmail.email || userByProviderEmail[providerEmailField],
                    signature: signAccountDeletionEmail(userByProviderEmail.email || userByProviderEmail[providerEmailField]),
                    deletionScheduledAt: userByProviderEmail.deletionScheduledAt,
                };
            }

            return { success: true, user: userByProviderEmail };
        }

        if (userByEmail && userByEmail.isDeleted) {
            return {
                success: false,
                code: "account_deleted",
                email: userByEmail.email || userByEmail.googleEmail || userByEmail.githubEmail || userByEmail.discordEmail,
                signature: signAccountDeletionEmail(userByEmail.email || userByEmail.googleEmail || userByEmail.githubEmail || userByEmail.discordEmail),
                deletionScheduledAt: userByEmail.deletionScheduledAt,
            };
        }

        if (type === "signup" && userByEmail) {
            if (!userByEmail.provider.includes(provider)) return { success: false, code: `user_already_exists_link_${provider}` };
            else return { success: false, code: "user_already_exists_linked" };
        }

        return { success: false, code: "user_not_found" };

    } catch (error) { return { success: false, code: "authentication_failed", error }; }
}

export async function authenticationWithGoogle(email, type) {
    return authenticationWithProvider(email, type, "google");
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

export async function linkAccount(providerEmail, email, password, type) {
    try {
        if (!email || !password) return { success: false, code: "email_password_missing" };
        if (!meetsPasswordRequirements(password)) return { success: false, code: "password_requirements_false" };

        const user = await prisma.user.findFirst({ where: { email } });
        if (!user) return { success: false, code: "invalid_credentials" };

        if (user.isDeleted) {
            return { success: false, code: "account_deleted" };
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return { success: false, code: "invalid_credentials" };

        const providerEmailField = getProviderEmailField(type);
        if (providerEmailField) {
            if (user.provider.includes(type)) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        [providerEmailField]: providerEmail
                    }
                });
                user[providerEmailField] = providerEmail;
            } else if (!user.provider.includes(type)) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        [providerEmailField]: providerEmail,
                        provider: `${user.provider}+${type}`
                    }
                });
                user[providerEmailField] = providerEmail;
                user.provider = `${user.provider}+${type}`;
            }
        } else if (type === "credentials") {
            if (user.provider.includes("google") || user.provider.includes("github") || user.provider.includes("discord")) {
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

export async function verifyPassword(plainPassword, hashedPassword) {
    try {
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
        return false;
    }
}