// lib/db.js

import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/prisma/generated/prisma/client";

const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? '',
});

const prisma = new PrismaClient({ adapter });
export default prisma;
