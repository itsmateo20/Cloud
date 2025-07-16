// lib/clearDatabase.js
"use server";

import { prisma } from "./db";

export async function clear() {
    try {
        console.log("Starting database clear...");
        await prisma.userSettings.deleteMany();
        console.log("Cleared user settings");
        await prisma.file.deleteMany();
        console.log("Cleared files");
        await prisma.folder.deleteMany();
        console.log("Cleared folders");
        await prisma.user.deleteMany();
        console.log("Cleared users");
        await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name = 'User'`;
        await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name = 'UserSettings'`;
        await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name = 'File'`;
        await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name = 'Folder'`;
        console.log("Reset auto-increment sequences");
        await prisma.$executeRaw`VACUUM`;
        console.log("Vacuumed database");

        console.log("Database fully cleared and reset!");
        return { success: true, code: "database_cleared_and_reset" };
    } catch (error) {
        console.error("Error clearing database:", error);
        return { success: false, error: error.message };
    }
}