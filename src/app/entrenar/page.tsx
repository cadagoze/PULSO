import { Suspense } from "react";
import { TrainHub, TrainSkeleton } from "@/components/train/train-hub";

export default function TrainingPage() {
  return (
    <Suspense fallback={<TrainSkeleton />}>
      <TrainHub />
    </Suspense>
  );
}
