import type { Metadata } from "next";
import { SessionLogger } from "@/components/session/session-logger";

export const metadata: Metadata = { title: "Entrenamiento en curso" };

export default function SessionPage() {
  return <SessionLogger />;
}
