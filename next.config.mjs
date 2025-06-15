/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
    reactStrictMode: true,

    async redirects() {
        return [
            { source: '/register', destination: '/signup', permanent: true },
        ];
    },

    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'Referrer-Policy', value: 'no-referrer' },
                    { key: 'strict-transport-security', value: 'max-age=63072000; includeSubDomains; preload' },
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none';",
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), payment=()',
                    },
                ],
            },
            {
                source: '/sw.js',
                headers: [
                    { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
                    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                ],
            },
        ];
    },

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'www.gravatar.com',
                pathname: '/avatar/**',
            },
        ],
    },
};

export default nextConfig;
