import { Suspense } from "react";
import { ExerciseLibrary } from "@/components/library/exercise-library";

/** Esqueleto mientras se leen los filtros de la URL (la biblioteca se pinta en el cliente). */
function LibrarySkeleton() {
  return (
    <div className="page lib-page" aria-busy="true">
      <div className="lib-skel lib-skel-title" />
      <div className="lib-skel lib-skel-search" />
      <div className="lib-skel lib-skel-row" />
    </div>
  );
}

export default function ExercisesPage() {
  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <ExerciseLibrary />
    </Suspense>
  );
}
