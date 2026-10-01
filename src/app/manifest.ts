import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PULSO",
    short_name: "PULSO",
    description: "Tu salud en movimiento.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f6f2",
    theme_color: "#20372b",
    lang: "es",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Entrenar", short_name: "Entrenar", url: "/entrenar", icons: [{ src: "/icon/192", sizes: "192x192", type: "image/png" }] },
      { name: "Intervalos", short_name: "Intervalos", url: "/entrenar/intervalos", icons: [{ src: "/icon/192", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
