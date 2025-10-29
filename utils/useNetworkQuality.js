// utils/useNetworkQuality.js

import { useEffect, useState, useRef } from 'react';

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
            if (effectiveType === 'slow-2g' || effectiveType === '2g') derived = 'low';
            else if (effectiveType === '3g') derived = 'medium';
            else if (effectiveType === '4g') derived = 'high';
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
        async function sampleRtt() {
            if (samplingRef.current.active) return;
            samplingRef.current.active = true;
            try {
                const samples = [];
                for (let i = 0; i < 3; i++) {
                    const start = performance.now();
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
                const currentIndex = QUALITY_ORDER.indexOf(quality);
                const newIndex = QUALITY_ORDER.indexOf(derived);
                if (newIndex < currentIndex - 1) {
                    derived = QUALITY_ORDER[currentIndex - 1];
                }
                setQuality(derived);
                setInfo(prev => ({ ...prev, rtt: avg, sampleRtts: samples }));
            } finally {
                samplingRef.current.active = false;
            }
        }
        if (!connection) sampleRtt();
        const interval = setInterval(sampleRtt, 30_000);
        return () => {
            clearInterval(interval);
            if (connection) connection.removeEventListener('change', deriveFromConnection);
        };
    }, [quality]);

    return { quality, info };
}

export function useNetworkTierConfig() {
    const { quality, info } = useNetworkQuality();
    const config = {
        low: { thumbnailConcurrency: 2, sizeParam: 'small' },
        medium: { thumbnailConcurrency: 4, sizeParam: 'medium' },
        high: { thumbnailConcurrency: 8, sizeParam: 'large' }
    }[quality] || { thumbnailConcurrency: 4, sizeParam: 'medium' };

    return { quality, ...config, info };
}
