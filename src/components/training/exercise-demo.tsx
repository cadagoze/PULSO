import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";

export function ExerciseDemo({ exercise, compact = false }: { exercise: Exercise; compact?: boolean }) {
  return <figure className={cn("exercise-demo", compact && "compact")}><div><Image src={exercise.image} alt={exercise.imageAlt} fill sizes={compact ? "(max-width: 620px) 92vw, 520px" : "(max-width: 620px) 84vw, 480px"} /><span className="demo-start">INICIO</span><span className="demo-finish">MOVIMIENTO</span></div><figcaption>Observa la posición completa y luego sigue los pasos de técnica.</figcaption></figure>;
}
