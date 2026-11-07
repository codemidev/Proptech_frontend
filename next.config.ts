import type { NextConfig } from "next";

// The browser calls the API directly at NEXT_PUBLIC_API_URL when it is set
// (production on Vercel). These rewrites keep same-origin /api and /uploads
// paths working in local development, where the API runs on port 5000.
const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL?.trim() || "http://127.0.0.1:5000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${API_ORIGIN}/uploads/:path*`,
      },
    ];
  },

};

export default nextConfig;
