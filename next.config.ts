import path from 'path';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Servidor standalone: é o formato que a Hostinger publica e reinicia a cada build.
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: 'memory' };
    }
    return config;
  },
};

export default nextConfig;
