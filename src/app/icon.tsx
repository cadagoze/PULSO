import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/profile/brand-mark";

export const contentType = "image/png";

const icons = [
  { id: "32", size: 32, rounded: true },
  { id: "192", size: 192, rounded: true },
  { id: "512", size: 512, rounded: true },
  { id: "maskable", size: 512, rounded: false },
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
  return new ImageResponse(<BrandMark size={icon.size} rounded={icon.rounded} />, {
    width: icon.size,
    height: icon.size,
  });
}
