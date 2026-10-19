import type { Metadata } from "next";
import { WellnessView } from "@/components/wellness/wellness-view";

export const metadata: Metadata = { title: "Bienestar" };

export default function WellnessPage() {
  return <WellnessView />;
}
