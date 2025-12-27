// app/api/user/settings/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from "@/lib/db";

export async function GET() {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        let userSettings = await prisma.userSettings.findUnique({
            where: { userId: userId }
        });

        if (!userSettings) {
            userSettings = await prisma.userSettings.create({
                data: {
                    userId: userId,
                    theme: 'device',
                    language: 'en_US',
                    defaultView: 'details',
                    defaultSort: 'name',
                    imageQuality: 'best',
                    uploadQuality: 'best'
                }
            });
        }

        return NextResponse.json({
            success: true,
            settings: {
                theme: userSettings.theme,
                language: userSettings.language,
                defaultView: userSettings.defaultView,
                defaultSort: userSettings.defaultSort,
                imageQuality: userSettings.imageQuality,
                uploadQuality: userSettings.uploadQuality
            }
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch settings'
        }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const { theme, language, defaultView, defaultSort, imageQuality, uploadQuality } = await req.json();

        const validThemes = ['light', 'dark', 'high-contrast', 'device'];
        const validViews = ['list', 'details', 'tiles'];
        const validSorts = ['name', 'date', 'size', 'type'];
        const validQualities = ['best', 'medium', 'low'];

        if (theme && !validThemes.includes(theme)) {
            return NextResponse.json({ success: false, message: 'Invalid theme' }, { status: 400 });
        }

        if (defaultView && !validViews.includes(defaultView)) {
            return NextResponse.json({ success: false, message: 'Invalid default view' }, { status: 400 });
        }

        if (defaultSort && !validSorts.includes(defaultSort)) {
            return NextResponse.json({ success: false, message: 'Invalid default sort' }, { status: 400 });
        }

        if (imageQuality && !validQualities.includes(imageQuality)) {
            return NextResponse.json({ success: false, message: 'Invalid image quality' }, { status: 400 });
        }

        if (uploadQuality && !validQualities.includes(uploadQuality)) {
            return NextResponse.json({ success: false, message: 'Invalid upload quality' }, { status: 400 });
        }

        const updateData = {};
        if (theme !== undefined) updateData.theme = theme;
        if (language !== undefined) updateData.language = language;
        if (defaultView !== undefined) updateData.defaultView = defaultView;
        if (defaultSort !== undefined) updateData.defaultSort = defaultSort;
        if (imageQuality !== undefined) updateData.imageQuality = imageQuality;
        if (uploadQuality !== undefined) updateData.uploadQuality = uploadQuality;

        const userSettings = await prisma.userSettings.upsert({
            where: { userId: userId },
            update: updateData,
            create: {
                userId: userId,
                theme: theme || 'device',
                language: language || 'en_US',
                defaultView: defaultView || 'details',
                defaultSort: defaultSort || 'name',
                imageQuality: imageQuality || 'best',
                uploadQuality: uploadQuality || 'best'
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Settings updated successfully',
            settings: {
                theme: userSettings.theme,
                language: userSettings.language,
                defaultView: userSettings.defaultView,
                defaultSort: userSettings.defaultSort,
                imageQuality: userSettings.imageQuality,
                uploadQuality: userSettings.uploadQuality
            }
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: 'Failed to update settings'
        }, { status: 500 });
    }
}