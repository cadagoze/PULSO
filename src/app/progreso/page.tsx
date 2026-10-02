import { Suspense } from "react";
import { ProgressView } from "@/components/progress/progress-view";
import { ProgressSkeleton } from "@/components/progress/summary-tab";

export default function ProgressPage() {
  return (
    <Suspense fallback={<ProgressSkeleton />}>
      <ProgressView />
    </Suspense>
  );
}
