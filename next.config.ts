import type { NextConfig } from "next";

const basePathRaw = process.env.NEXT_PUBLIC_BASE_PATH;
const basePath =
  basePathRaw && basePathRaw.length > 0
    ? basePathRaw.startsWith("/") ? basePathRaw : `/${basePathRaw}`
    : undefined;

const nextConfig: NextConfig = {
  // GitHub Pages serves static files only. `output: "export"` generates the `out/` folder.
  output: "export",
  trailingSlash: true,
  basePath,
  // Ensure assets resolve correctly when deployed under a subpath (project pages).
  assetPrefix: basePath,
};

export default nextConfig;
