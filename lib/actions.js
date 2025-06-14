// lib/actions.js
"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getUserData(value) {
    try {
        const userExists = await checkUserExists(value);
        if (!userExists.exists) return false;

        const userData = await prisma.user.findUnique({
            where: { id: userExists.id }
        });
        return userData ? userData : false;
    } catch (error) {
        console.error("Error getting user data:", error);
        return false;
    }
}

export async function setUserData(value, data) {
    try {
        const userExists = await checkUserExists(value);
        if (!userExists.exists) return false;

        await prisma.user.update({
            where: { id: userExists.id },
            data
        });
        return true;
    } catch (error) {
        console.error("Error setting user data:", error);
        return false;
    }
}

export async function checkUserExists(value, field) {
    try {
        const user = await prisma.user.findFirst({
            where: { [field]: value }
        });
        return { exists: !!user, id: user?.id };
    } catch (error) {
        console.error("Error checking user existence:", error);
        throw error;
    }
}