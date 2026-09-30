import { Suspense } from "react";
import { WorkoutTracker } from "@/components/training/workout-tracker";
export default function SessionPage() { return <Suspense fallback={<p>Cargando entrenamiento…</p>}><WorkoutTracker/></Suspense>; }
