/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  transpilePackages: ["@/components/ui"], // Add this for shadcn/ui
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn-news.shironam.news",
        port: "",
        pathname: "/storage/shironam-media/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/dt1tch0v9/image/upload/**",
      },
      {
        // Supabase Storage public URLs (machine images)
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true, // ✅ FIX VERCEL BUILD ERROR
  },
  trailingSlash: true,
  // Serve /api/v1/* exactly as requested (no 308 redirect to a trailing slash)
  skipTrailingSlashRedirect: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

export default nextConfig;
