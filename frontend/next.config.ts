import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack konfigürasyonu (Next.js 16 için gerekli)
  turbopack: {},
  // Webpack konfigürasyonu (webpack kullanıldığında)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side için exceljs modülünü resolve et
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
