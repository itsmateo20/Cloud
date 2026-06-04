// app/api/user/cancel-deletion/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/db';

export async function POST(req) {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        // Check if account is actually scheduled for deletion
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.isDeleted || !user.deletionScheduledAt) {
            return NextResponse.json(
                { success: false, message: 'Account is not scheduled for deletion' },
                { status: 400 }
            );
        }

        // Cancel the deletion
        await prisma.user.update({
            where: { id: userId },
            data: {
                isDeleted: false,
                deletionScheduledAt: null
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Account deletion has been cancelled'
        });
    } catch (error) {
        console.error('Cancel deletion error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to cancel deletion' },
            { status: 500 }
        );
    }
}
