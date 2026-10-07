import type { Metadata } from "next";
import { FitnessTestFlow } from "@/components/fitness-test/fitness-test-flow";

export const metadata: Metadata = { title: "Test físico" };

export default function FitnessTestPage() {
  return <FitnessTestFlow />;
}
