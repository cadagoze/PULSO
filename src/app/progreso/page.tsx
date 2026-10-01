import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { ProgressView } from "@/components/progress/progress-view";

export default function ProgressPage() {
  return (
    <Suspense fallback={<ProgressFallback />}>
      <ProgressView />
    </Suspense>
  );
}

function ProgressFallback() {
  return (
    <div className="page prog-page">
      <PageHeader eyebrow="TU EVOLUCIÓN" title="Progreso" />
      <div className="prog-skeleton" aria-hidden="true" />
    </div>
  );
}
