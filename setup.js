#!/usr/bin/env node

// Minimal DB setup script: runs Prisma migrations (dev) and generates client
const { spawn } = require('child_process');

async function run(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
        });
    });
}

async function main() {
    const runner = process.env.USE_BUN ? 'bunx' : 'npx';
    await run(runner, ['prisma', 'migrate', 'dev', '--name', 'init']);
    await run(runner, ['prisma', 'generate']);
}

main().catch((err) => {
    console.error('Setup failed:', err?.message || err);
    process.exitCode = 1;
});
