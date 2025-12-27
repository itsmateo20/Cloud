// setup.js

const { spawn } = require('child_process');

async function run(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
        });
        child.on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {

    process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./database.sqlite';

    const isWin = process.platform === 'win32';
    const preferredRunner = process.env.USE_BUN ? 'bunx' : 'npx';
    const runner = isWin ? `${preferredRunner}.cmd` : preferredRunner;

    try {
        await run(runner, ['prisma', 'migrate', 'dev', '--name', 'init']);
        await run(runner, ['prisma', 'generate']);
    } catch (err) {
        if (err && err.message && /ENOENT/.test(err.message)) {
            console.warn(`${runner} not found, falling back to using npm exec`);
            await run('npm', ['exec', '--', 'prisma', 'migrate', 'dev', '--name', 'init']);
            await run('npm', ['exec', '--', 'prisma', 'generate']);
        } else {
            throw err;
        }
    }
}

main().catch((err) => {
    console.error('Setup failed:', err?.message || err);
    process.exitCode = 1;
});
