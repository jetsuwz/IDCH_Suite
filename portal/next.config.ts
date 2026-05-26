import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5000mb', // Limit dinaikkan hingga 5 GB (hampir unlimited)
    },
  },
};

export default nextConfig;
