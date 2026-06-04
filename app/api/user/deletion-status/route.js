// app/api/user/deletion-status/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/db';

export async function GET(req) {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            isDeleted: user.isDeleted,
            deletionScheduledAt: user.deletionScheduledAt,
            daysUntilDeletion: user.deletionScheduledAt
                ? Math.ceil((new Date(user.deletionScheduledAt) - new Date()) / (1000 * 60 * 60 * 24))
                : null
        });
    } catch (error) {
        console.error('Get deletion status error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to get deletion status' },
            { status: 500 }
        );
    }
}
