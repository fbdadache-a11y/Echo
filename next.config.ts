import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fjiyckxmtksmqhyllirt.supabase.co",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/9.x/initials/svg",
      },
    ],
  },
};

export default nextConfig;
