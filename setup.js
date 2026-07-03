require('dotenv/config');
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
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./prisma/database.sqlite';

    const isBun = !!process.versions.bun;
    const runner = isBun ? 'bunx' : 'npx';

    console.log(`Initializing database using ${runner}...`);

    try {

        await run(runner, ['prisma', 'db', 'push']);
        await run(runner, ['prisma', 'generate']);
        console.log('🎉 Database setup completed successfully!');
    } catch (err) {
        console.warn(`\n⚠️  ${runner} setup failed, attempting npm fallback...`);
        try {
            await run('npm', ['exec', '--', 'prisma', 'db', 'push']);
            await run('npm', ['exec', '--', 'prisma', 'generate']);
            console.log('🎉 Database setup completed successfully via npm fallback!');
        } catch (fallbackErr) {
            throw new Error(`Both primary setup and fallback failed. Original error: ${err.message}`);
        }
    }
}

main().catch((err) => {
    console.error('\n❌ Setup failed:', err?.message || err);
    process.exitCode = 1;
});