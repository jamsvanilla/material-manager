import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow sharp native module
  serverExternalPackages: ['sharp', 'better-sqlite3'],
};

export default nextConfig;
