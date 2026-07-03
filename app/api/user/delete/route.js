// app/api/user/delete/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { buildAccountDisabledPath } from '@/lib/accountDeletion';
import { getSiteUrl } from '@/lib/getSiteUrl';

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
        const { password } = await req.json();

        if (!password || !password.trim()) {
            return NextResponse.json(
                { success: false, message: 'Password is required' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, message: 'Invalid password' },
                { status: 401 }
            );
        }

        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + 30);

        await prisma.user.update({
            where: { id: userId },
            data: {
                isDeleted: true,
                deletionScheduledAt: deletionDate
            }
        });

        await prisma.clientToken.updateMany({
            where: { userId: userId },
            data: { revokedAt: new Date() }
        });

        const cancelPath = buildAccountDisabledPath(user.email || user.googleEmail);
        const cancelUrl = cancelPath ? `${await getSiteUrl()}${cancelPath}` : null;

        return NextResponse.json({
            success: true,
            message: 'Account has been disabled and scheduled for deletion',
            cancelUrl
        });
    } catch (error) {
        console.error('Delete account error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to delete account' },
            { status: 500 }
        );
    }
}
