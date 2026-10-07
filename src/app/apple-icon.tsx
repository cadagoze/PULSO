import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/brand/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS redondea el ícono por su cuenta: se dibuja a sangre completa. Logo 2 (2026-10-07): cambiarlo también cambia la URL. */
export default function AppleIcon() {
  return new ImageResponse(<BrandMark size={180} rounded={false} />, size);
}
