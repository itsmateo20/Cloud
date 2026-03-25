import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureAdminSession, parseUserId, getUserForAdmin } from "@/lib/adminAuth";

const validThemes = ["light", "dark", "high-contrast", "device"];
const validViews = ["extraLargeIcons", "largeIcons", "mediumIcons", "smallIcons", "list", "details", "tiles"];
const validSorts = ["name", "date", "size", "type"];
const validQualities = ["best", "medium", "low"];
const validThumbnailResolutions = ["high", "medium", "low"];

function validateSettings(data) {
    if (data.theme && !validThemes.includes(data.theme)) return "Invalid theme";
    if (data.defaultView && !validViews.includes(data.defaultView)) return "Invalid default view";
    if (data.defaultSort && !validSorts.includes(data.defaultSort)) return "Invalid default sort";
    if (data.imageQuality && !validQualities.includes(data.imageQuality)) return "Invalid image quality";
    if (data.uploadQuality && !validQualities.includes(data.uploadQuality)) return "Invalid upload quality";
    if (data.thumbnailResolution && !validThumbnailResolutions.includes(data.thumbnailResolution)) return "Invalid thumbnail resolution";
    return null;
}

export async function GET(_req, context) {
    try {
        const session = await getSession();
        const adminCheck = await ensureAdminSession(session);
        if (!adminCheck.success) {
            return NextResponse.json(adminCheck.response, { status: adminCheck.status });
        }

        const params = await context.params;
        const userId = parseUserId(params?.userId);
        if (!userId) {
            return NextResponse.json({ success: false, code: "invalid_user_id", message: "Invalid user id" }, { status: 400 });
        }

        const user = await getUserForAdmin(userId);
        if (!user) {
            return NextResponse.json({ success: false, code: "user_not_found", message: "User not found" }, { status: 404 });
        }

        let settings = user.settings;
        if (!settings) {
            settings = await prisma.userSettings.create({
                data: {
                    userId,
                    theme: "device",
                    language: "en_US",
                    defaultView: "details",
                    defaultSort: "name",
                    imageQuality: "best",
                    uploadQuality: "best",
                    thumbnailResolution: "medium",
                }
            });
        }

        return NextResponse.json({ success: true, settings });
    } catch {
        return NextResponse.json({ success: false, code: "admin_user_settings_get_failed", message: "Failed to fetch user settings" }, { status: 500 });
    }
}

export async function POST(req, context) {
    try {
        const session = await getSession();
        const adminCheck = await ensureAdminSession(session);
        if (!adminCheck.success) {
            return NextResponse.json(adminCheck.response, { status: adminCheck.status });
        }

        const params = await context.params;
        const userId = parseUserId(params?.userId);
        if (!userId) {
            return NextResponse.json({ success: false, code: "invalid_user_id", message: "Invalid user id" }, { status: 400 });
        }

        const payload = await req.json();
        const validationError = validateSettings(payload || {});
        if (validationError) {
            return NextResponse.json({ success: false, code: "invalid_settings", message: validationError }, { status: 400 });
        }

        const updateData = {};
        if (payload.theme !== undefined) updateData.theme = payload.theme;
        if (payload.language !== undefined) updateData.language = payload.language;
        if (payload.defaultView !== undefined) updateData.defaultView = payload.defaultView;
        if (payload.defaultSort !== undefined) updateData.defaultSort = payload.defaultSort;
        if (payload.imageQuality !== undefined) updateData.imageQuality = payload.imageQuality;
        if (payload.uploadQuality !== undefined) updateData.uploadQuality = payload.uploadQuality;
        if (payload.thumbnailResolution !== undefined) updateData.thumbnailResolution = payload.thumbnailResolution;

        const settings = await prisma.userSettings.upsert({
            where: { userId },
            update: updateData,
            create: {
                userId,
                theme: payload.theme || "device",
                language: payload.language || "en_US",
                defaultView: payload.defaultView || "details",
                defaultSort: payload.defaultSort || "name",
                imageQuality: payload.imageQuality || "best",
                uploadQuality: payload.uploadQuality || "best",
                thumbnailResolution: payload.thumbnailResolution || "medium",
            }
        });

        return NextResponse.json({ success: true, settings });
    } catch {
        return NextResponse.json({ success: false, code: "admin_user_settings_update_failed", message: "Failed to update user settings" }, { status: 500 });
    }
}
