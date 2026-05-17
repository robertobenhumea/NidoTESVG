import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* ── Image optimization ── */
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.0.16',
        port: '8080',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.tesvg.edu.mx',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 430, 768, 1024, 1280, 1440],
    imageSizes: [32, 48, 64, 96, 128, 256],
  },

  /* ── Local network dev access ── */
  allowedDevOrigins: ['192.168.0.16'],

  /* ── Bundle optimization ── */
  experimental: {
    optimizePackageImports: ['next/font'],
  },

  /* ── Security & performance headers ── */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',          value: 'DENY' },
          { key: 'X-XSS-Protection',         value: '1; mode=block' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control',          value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
