import { Suspense } from "react";
import { TrainHub } from "@/components/train/train-hub";

export default function TrainingPage() {
  return (
    <Suspense fallback={<div className="page train-page" aria-busy="true" />}>
      <TrainHub />
    </Suspense>
  );
}
