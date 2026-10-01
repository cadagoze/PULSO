import type { Metadata } from "next";
import { IntervalTimer } from "@/components/session/interval-timer";

export const metadata: Metadata = { title: "Intervalos" };

export default function IntervalsPage() {
  return <IntervalTimer />;
}
