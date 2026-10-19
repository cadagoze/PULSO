import { Suspense } from "react";
import type { Metadata } from "next";
import { ToolsHub } from "@/components/tools/tools-hub";

export const metadata: Metadata = { title: "Herramientas" };

export default function ToolsPage() {
  return (
    <Suspense fallback={<div className="page tools-page" aria-busy="true" />}>
      <ToolsHub />
    </Suspense>
  );
}
