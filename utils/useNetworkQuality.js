// utils/useNetworkQuality.js
// Simple hook to derive a network quality tier (low, medium, high)
// Uses the Network Information API when available; falls back to measuring a tiny image fetch RTT.
// This is intentionally lightweight; can be extended with more robust heuristics (error rates, throughput sampling).

import { useEffect, useState, useRef } from 'react';

/**
 * Network quality tiers definition
 * low: 2G / very slow -> limit concurrency + request smaller thumbnails
 * medium: normal wifi/4G baseline
 * high: strong wifi/ethernet -> can raise concurrency
 */
const QUALITY_ORDER = ['low', 'medium', 'high'];

export function useNetworkQuality() {
    const [quality, setQuality] = useState('medium');
    const [info, setInfo] = useState({
        downlink: null,
        effectiveType: null,
        rtt: null,
        sampleRtts: []
    });
    const samplingRef = useRef({ active: false });

    useEffect(() => {
        const nav = typeof navigator !== 'undefined' ? navigator : null;
        const connection = nav && (nav.connection || nav.mozConnection || nav.webkitConnection);

        function deriveFromConnection(c) {
            if (!c) return;
            const { effectiveType, downlink, rtt } = c;
            let derived = 'medium';
            // crude mapping
            if (effectiveType === 'slow-2g' || effectiveType === '2g') derived = 'low';
            else if (effectiveType === '3g') derived = 'medium';
            else if (effectiveType === '4g') derived = 'high';
            // fallback heuristics
            if (downlink && downlink < 1) derived = 'low';
            if (rtt && rtt > 600) derived = 'low';
            if (downlink && downlink > 10 && rtt && rtt < 150) derived = 'high';
            setQuality(derived);
            setInfo(prev => ({ ...prev, downlink, effectiveType, rtt }));
        }

        if (connection) {
            deriveFromConnection(connection);
            connection.addEventListener('change', () => deriveFromConnection(connection));
        }

        // Lightweight RTT sampler (only if we lack connection API OR want refinement)
        async function sampleRtt() {
            if (samplingRef.current.active) return;
            samplingRef.current.active = true;
            try {
                const samples = [];
                for (let i = 0; i < 3; i++) {
                    const start = performance.now();
                    // Use a small data URI fetch to avoid network dependency. Fallback to a tiny endpoint if needed.
                    // We use a cache-busting query to avoid hitting HTTP cache if replaced with an asset later.
                    await fetch(`/api/health?_=${Date.now()}&i=${i}`, { method: 'GET', cache: 'no-store' }).catch(() => { });
                    const elapsed = performance.now() - start;
                    samples.push(elapsed);
                    await new Promise(r => setTimeout(r, 150));
                }
                const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
                let derived = quality;
                if (avg > 1200) derived = 'low';
                else if (avg > 500) derived = 'medium';
                else if (avg <= 500) derived = 'high';
                // Never downgrade from an explicitly strong connection reading more than one tier at once
                const currentIndex = QUALITY_ORDER.indexOf(quality);
                const newIndex = QUALITY_ORDER.indexOf(derived);
                if (newIndex < currentIndex - 1) {
                    // soften abrupt large downgrade
                    derived = QUALITY_ORDER[currentIndex - 1];
                }
                setQuality(derived);
                setInfo(prev => ({ ...prev, rtt: avg, sampleRtts: samples }));
            } finally {
                samplingRef.current.active = false;
            }
        }

        // If no connection API, run sampler, else schedule a refinement sample occasionally
        if (!connection) sampleRtt();
        const interval = setInterval(sampleRtt, 30_000); // refresh every 30s
        return () => {
            clearInterval(interval);
            if (connection) connection.removeEventListener('change', deriveFromConnection);
        };
    }, [quality]);

    return { quality, info };
}

export function useNetworkTierConfig() {
    const { quality, info } = useNetworkQuality();
    // Map quality to concurrency & size label
    const config = {
        low: { thumbnailConcurrency: 2, sizeParam: 'small' },
        medium: { thumbnailConcurrency: 4, sizeParam: 'medium' },
        high: { thumbnailConcurrency: 8, sizeParam: 'large' }
    }[quality] || { thumbnailConcurrency: 4, sizeParam: 'medium' };

    return { quality, ...config, info };
}
