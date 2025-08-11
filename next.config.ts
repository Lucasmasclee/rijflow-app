import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Suppress hydration warnings in development (useful for browser extensions)
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Capacitor optimalisaties
  experimental: {
    // Voorkom dat TypeScript bestanden worden gekopieerd
    outputFileTracing: false,
  },
  // Voorkom source maps in productie
  productionBrowserSourceMaps: false,
};

export default withPWA({
  dest: 'public',
  // You can add more PWA options here if needed
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});
