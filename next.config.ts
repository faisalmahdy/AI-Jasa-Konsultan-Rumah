import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native module (better-sqlite3) and the heavy PDF renderer must NOT be bundled.
  // They run only inside Node-runtime route handlers. Bundling breaks the native
  // .node binary and bloats the server build. Works with Turbopack (default in v16).
  serverExternalPackages: ["better-sqlite3", "@react-pdf/renderer"],
};

export default nextConfig;
