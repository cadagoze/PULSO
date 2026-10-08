import type { Metadata } from "next";
import { BreaksView } from "@/components/breaks/breaks-view";

export const metadata: Metadata = { title: "Pausas activas" };

export default function BreaksPage() {
  return <BreaksView />;
}
