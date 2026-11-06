import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: __dirname },
  // The throwaway list is read at runtime, so it has to ship with the API route.
  outputFileTracingIncludes: { '/api/verify': ['./data/disposable-domains.txt'], '/healthz': ['./data/disposable-domains.txt'] },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};

export default config;
