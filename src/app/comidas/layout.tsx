import type { Metadata } from "next";

export const metadata: Metadata = { title: "Comidas y hábitos" };

export default function MealsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
