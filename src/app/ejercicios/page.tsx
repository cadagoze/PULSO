import { Suspense } from "react";
import { ExerciseLibrary } from "@/components/library/exercise-library";

export default function ExercisesPage() {
  return (
    <Suspense fallback={<div className="page lib-page" aria-busy="true" />}>
      <ExerciseLibrary />
    </Suspense>
  );
}
