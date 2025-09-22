#!/usr/bin/env node

/* Setup bootstrap script
 * - Loads environment
 * - Ensures upload and temp directories exist
 * - Runs Prisma migrate deploy and generate
 * - Verifies DB connectivity
 */

const path = require('path');
const { spawn } = require('child_process');

// Best-effort load of .env if dotenvx is not used to run this script
try { require('dotenv').config(); } catch (_) { }

async function run(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
        });
    });
}

async function ensurePaths() {
    // Use dynamic import to reuse project helpers without transpile
    const { ensureUploadBasePath, ensureTempBasePath } = await import(path.join(process.cwd(), 'lib', 'paths.js'));
    const upload = await ensureUploadBasePath();
    if (!upload.success) throw new Error(`Upload base path error: ${upload.error}`);
    const temp = await ensureTempBasePath();
    if (!temp.success) throw new Error(`Temp base path error: ${temp.error}`);
    return { upload: upload.path, temp: temp.path };
}

async function prismaMigrate() {
    // Prefer bunx if available, else npx
    const runner = process.env.USE_BUN ? 'bunx' : 'npx';
    await run(runner, ['prisma', 'migrate', 'deploy']);
    await run(runner, ['prisma', 'generate']);
}

async function pingDB() {
    const { prisma } = await import(path.join(process.cwd(), 'lib', 'db.js'));
    // A trivial query to ensure DB is reachable
    await prisma.$queryRaw`SELECT 1`;
}

async function main() {
    console.log('> Setup starting...');
    console.log(`> CWD: ${process.cwd()}`);

    const paths = await ensurePaths();
    console.log(`> Upload base: ${paths.upload}`);
    console.log(`> Temp base:   ${paths.temp}`);

    console.log('> Applying Prisma migrations...');
    await prismaMigrate();

    console.log('> Verifying database connectivity...');
    await pingDB();

    console.log('> Setup completed successfully.');
}

main().catch((err) => {
    console.error('Setup failed:', err?.message || err);
    process.exitCode = 1;
});
