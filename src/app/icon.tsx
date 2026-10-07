import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/brand/brand-mark";

// Logo 2 (2026-10-07): editar este archivo cambia la URL del ícono y evita copias guardadas.
export const contentType = "image/png";

const icons = [
  // En 32 px el isotipo va más grande y sin brillo para que se lea en la pestaña.
  { id: "32", size: 32, rounded: true, scale: 0.76, glow: false },
  { id: "192", size: 192, rounded: true, scale: 0.6, glow: true },
  { id: "512", size: 512, rounded: true, scale: 0.6, glow: true },
  // Android recorta en círculo: el isotipo cabe dentro de la zona segura (80 %).
  { id: "maskable", size: 512, rounded: false, scale: 0.54, glow: true },
] as const;

export function generateImageMetadata() {
  return icons.map((icon) => ({
    id: icon.id,
    size: { width: icon.size, height: icon.size },
    contentType,
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const key = await id;
  const icon = icons.find((item) => item.id === key) ?? icons[0];
  return new ImageResponse(<BrandMark size={icon.size} rounded={icon.rounded} scale={icon.scale} glow={icon.glow} />, {
    width: icon.size,
    height: icon.size,
  });
}
