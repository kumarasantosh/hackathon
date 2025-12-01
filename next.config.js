/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  eslint: {
    // ✅ This allows production builds to continue even if ESLint errors exist.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ✅ Skip TypeScript type checking during builds (no type blocking)
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
