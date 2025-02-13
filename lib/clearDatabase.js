// lib/clearDatabase.js
"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function clear() {
    try {
        await prisma.userSettings.deleteMany();
        await prisma.user.deleteMany();

        return { success: true, code: "database_cleared" };
    } catch (error) {
        return { success: false, error: error.message };
    }
}