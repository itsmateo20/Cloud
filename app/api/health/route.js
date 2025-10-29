import { NextResponse } from 'next/server';

// Lightweight health endpoint used for RTT sampling by useNetworkQuality hook.
// Returns tiny JSON and cache disabled so each fetch measures real latency.
export async function GET() {
    return NextResponse.json({ ok: true, t: Date.now() }, {
        headers: {
            'Cache-Control': 'no-store',
        }
    });
}