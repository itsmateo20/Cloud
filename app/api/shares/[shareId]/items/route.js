// app/api/shares/[shareId]/items/route.js

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/db";
import {
    appendItemsToShareByOwner,
    ensureShareTables,
    getShareByOwner,
    removeShareItemByOwner
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

async function validateOwnerItems(ownerId, items) {
    const valid = [];
    for (const item of items) {
        if (item.type === "folder") {
            const folder = await prisma.folder.findFirst({ where: { ownerId, path: item.path } });
            if (folder) valid.push(item);
        } else {
            const file = await prisma.file.findFirst({ where: { ownerId, path: item.path } });
            if (file) valid.push(item);
        }
    }
    return valid;
}

export async function POST(req, { params }) {
    const { shareId } = await params;
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    try {
        await ensureShareTables();
        const body = await req.json();
        const items = normalizeItems(body.items);
        if (!items.length) {
            return NextResponse.json({ success: false, code: "share_items_required", message: "No items to append" }, { status: 400 });
        }

        const share = await getShareByOwner(session.user.id, shareId);
        if (!share) {
            return NextResponse.json({ success: false, code: "share_not_found", message: "Share not found" }, { status: 404 });
        }

        const validatedItems = await validateOwnerItems(session.user.id, items);
        if (!validatedItems.length) {
            return NextResponse.json({ success: false, code: "share_invalid_items", message: "None of the items are valid" }, { status: 400 });
        }

        const updated = await appendItemsToShareByOwner(session.user.id, shareId, validatedItems);
        return NextResponse.json({ success: true, share: updated }, { status: 200 });
    } catch {
        return NextResponse.json({ success: false, code: "share_append_failed", message: "Failed to append items" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    const { shareId } = await params;
    const session = await getSession();
    if (!session?.success || !session?.user?.id) {
        return NextResponse.json({ success: false, code: "unauthorized" }, { status: 401 });
    }

    try {
        await ensureShareTables();
        const body = await req.json();
        const itemId = Number(body.itemId);
        if (!itemId) {
            return NextResponse.json({ success: false, code: "share_item_required", message: "itemId is required" }, { status: 400 });
        }

        const updated = await removeShareItemByOwner(session.user.id, shareId, itemId);
        if (!updated) {
            return NextResponse.json({ success: false, code: "share_not_found", message: "Share not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, share: updated }, { status: 200 });
    } catch {
        return NextResponse.json({ success: false, code: "share_remove_item_failed", message: "Failed to remove item from share" }, { status: 500 });
    }
}
