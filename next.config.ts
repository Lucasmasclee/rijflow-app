import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  // Suppress hydration warnings in development (useful for browser extensions)
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
};

export default withPWA({
  dest: 'public',
  // You can add more PWA options here if needed
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});
