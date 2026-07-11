import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: Next 16 blocks cross-origin dev requests by default. If you test
  // the PWA from another device (phone on the same network), list its origins
  // here via env, e.g. DEV_ORIGINS="192.168.0.*,my-host.example".
  ...(process.env.DEV_ORIGINS
    ? { allowedDevOrigins: process.env.DEV_ORIGINS.split(",") }
    : {}),
};

export default nextConfig;
