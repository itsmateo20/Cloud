// app/api/user/cancel-deletion/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/db';
import { verifyAccountDeletionSignature } from '@/lib/accountDeletion';
import { normalizeEmailAddress } from '@/lib/email';

export async function POST(req) {
    try {
        const session = await getSession();
        const body = await req.json().catch(() => ({}));
        const bodyEmail = normalizeEmailAddress(body?.email);
        const bodySignature = typeof body?.signature === 'string' ? body.signature : '';

        let userId = session?.user?.id;

        let user = null;

        if (!userId) {
            if (!bodyEmail || !bodySignature || !verifyAccountDeletionSignature(bodyEmail, bodySignature)) {
                return NextResponse.json(
                    { success: false, message: 'Unauthorized' },
                    { status: 401 }
                );
            }

            user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: bodyEmail },
                        { googleEmail: bodyEmail }
                    ]
                }
            });
            userId = user?.id;
        } else {
            user = await prisma.user.findUnique({
                where: { id: userId }
            });
        }

        if (!user || !user.isDeleted || !user.deletionScheduledAt) {
            return NextResponse.json(
                { success: false, message: 'Account is not scheduled for deletion' },
                { status: 400 }
            );
        }

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
