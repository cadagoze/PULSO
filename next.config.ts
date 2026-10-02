import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.105", "127.0.0.1"],
  // El indicador de desarrollo tapa la barra de navegación flotante.
  devIndicators: false,
};

export default nextConfig;
