import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: process.env.NODE_ENV === 'production',
  compiler: {
    removeConsole: {
      exclude: ['error'],
    },
  },
};

export default nextConfig;