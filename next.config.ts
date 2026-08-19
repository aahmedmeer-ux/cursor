import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@prisma/client", "pg"],
  // Allow Cloudflare quick-tunnel hosts during local/dev previews
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "involve-souls-memorial-country.trycloudflare.com",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
