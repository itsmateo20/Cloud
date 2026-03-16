// app/api/shares/route.js

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/db";
import {
    createShare,
    ensureShareTables,
    listSharesByOwner,
    parseDurationToExpiresAt
} from "@/lib/shares";

function normalizeItems(items = []) {
    return (Array.isArray(items) ? items : [])
        .map((item) => ({
            name: String(item?.name || "").trim(),
            path: String(item?.path || "").trim(),
            type: item?.type === "folder" ? "folder" : "file"
        }))
        .filter((item) => item.name && item.path);
}

export async function GET() {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    try {
        await ensureShareTables();
        const shares = await listSharesByOwner(session.user.id);
        return NextResponse.json({ success: true, shares }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "share_list_failed", message: "Failed to list shares" }, { status: 500 });
    }
}

export async function POST(req) {
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const items = normalizeItems(body.items);

        if (items.length === 0) {
            return NextResponse.json({ success: false, code: "share_items_required", message: "No items selected for sharing" }, { status: 400 });
        }

        await ensureShareTables();

        const validatedItems = [];
        for (const item of items) {
            if (item.type === "folder") {
                const folder = await prisma.folder.findFirst({ where: { ownerId: session.user.id, path: item.path } });
                if (!folder) {
                    return NextResponse.json({ success: false, code: "share_invalid_item", message: `Folder not found: ${item.path}` }, { status: 400 });
                }
                validatedItems.push(item);
            } else {
                const file = await prisma.file.findFirst({ where: { ownerId: session.user.id, path: item.path } });
                if (!file) {
                    return NextResponse.json({ success: false, code: "share_invalid_item", message: `File not found: ${item.path}` }, { status: 400 });
                }
                validatedItems.push(item);
            }
        }

        const normalizedDurationUnit = String(body.durationUnit || "").toLowerCase();
        const expiresAt = normalizedDurationUnit === "never"
            ? null
            : (body.expiresAt || parseDurationToExpiresAt(body.durationValue, body.durationUnit));

        const share = await createShare({
            ownerId: session.user.id,
            name: String(body.name || "Untitled Share").trim(),
            requireLogin: Boolean(body.requireLogin),
            allowedEmails: Array.isArray(body.allowedEmails) ? body.allowedEmails : [],
            passcode: body.passcode,
            expiresAt,
            items: validatedItems
        });

        return NextResponse.json({ success: true, share }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, code: "share_create_failed", message: "Failed to create share" }, { status: 500 });
    }
}
