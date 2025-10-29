// lib/memoryMonitor.js
// Lightweight optional memory usage logger. Enabled when process.env.MEMORY_LOG_INTERVAL_MS is set.

if (typeof process !== 'undefined' && !global.__memoryMonitorStarted) {
    const intervalMs = parseInt(process.env.MEMORY_LOG_INTERVAL_MS || '', 10);
    if (intervalMs && intervalMs > 0) {
        global.__memoryMonitorStarted = true;
        setInterval(() => {
            try {
                const m = process.memoryUsage();
                const fmt = (n) => (n / 1024 / 1024).toFixed(1) + 'MB';
                console.log(`[memory] rss=${fmt(m.rss)} heapUsed=${fmt(m.heapUsed)} heapTotal=${fmt(m.heapTotal)} ext=${fmt(m.external)} arrayBuffers=${fmt(m.arrayBuffers)}`);
            } catch { /* ignore */ }
        }, intervalMs).unref?.();
    }
}

export { }; // side-effect module