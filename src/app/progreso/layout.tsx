import type { Metadata } from "next";

export const metadata: Metadata = { title: "Progreso", description: "Tus entrenamientos, volumen, constancia y mejores marcas." };

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
