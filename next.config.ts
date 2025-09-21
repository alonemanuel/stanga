import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Add some debugging and ensure proper static generation
  // Note: logging config removed as it's not available in Next.js 15
  // Ensure all pages are properly generated
  trailingSlash: false,
};

export default nextConfig;
