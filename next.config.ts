import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
const path = require('path');

// Lógica para extrair o hostname da URL do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dynamicRemotePatterns = [];

try {
  if (supabaseUrl) {
    const host = new URL(supabaseUrl).host;
    dynamicRemotePatterns.push({ 
      protocol: 'https', 
      hostname: host,
      pathname: '/storage/v1/object/public/**',
    });
  }
} catch (e) {
  // ignora erro se a URL do ENV for inválida
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons'],
  },
  images: {
    remotePatterns: [
      ...dynamicRemotePatterns,
    ],
  },
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: [
    '@supabase/realtime-js',
    '@supabase/supabase-js',
  ],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async headers() {
    const imgSrcHosts = [];
    if (Array.isArray(dynamicRemotePatterns)) {
      for (const p of dynamicRemotePatterns) {
        if (p && p.hostname) imgSrcHosts.push(`https://${p.hostname}`);
      }
    }

  const cspParts = [
      "default-src 'self'",
      "base-uri 'self'",
  `img-src 'self' data: blob: ${imgSrcHosts.join(' ')}`.trim(),
  "script-src 'self' https://cdn.jsdelivr.net",
  "script-src-attr 'none'",
  "object-src 'none'",
  "style-src 'self' https://fonts.googleapis.com",
  "style-src-elem 'self' https://fonts.googleapis.com",
  "style-src-attr 'unsafe-inline'",
  "font-src 'self' data: https://fonts.gstatic.com",
  // permitir fetchs para CDN de ícones e assets (bootstrap icons via jsdelivr)
  "connect-src 'self' https://cdn.jsdelivr.net",
      "media-src 'self'",
      (() => {
        const hosts = [];
        if (Array.isArray(dynamicRemotePatterns)) {
          for (const p of dynamicRemotePatterns) {
            if (p && p.hostname) {
              hosts.push(`https://${p.hostname}`);
              hosts.push(`wss://${p.hostname}`);
            }
          }
        }
        return ["connect-src 'self' https://cdn.jsdelivr.net", ...hosts].join(' ');
      })(),
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ];

    const csp = cspParts.filter(Boolean).join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' },
        ],
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
  fallbacks: {
    document: "/offline",
  },
});

export default withPWA(nextConfig);
