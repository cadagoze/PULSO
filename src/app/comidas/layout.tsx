import type { Metadata } from "next";

export const metadata: Metadata = { title: "Comidas" };

export default function MealsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
