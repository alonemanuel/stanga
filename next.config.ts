import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Add some debugging and ensure proper static generation
  experimental: {
    logging: {
      level: 'verbose',
    },
  },
  // Ensure all pages are properly generated
  trailingSlash: false,
};

export default nextConfig;
