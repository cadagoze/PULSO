"use client";

import { useCallback } from "react";
import { programById, programSessionName, programSessionRecords } from "@/lib/programs";
import { useStartWorkout } from "@/lib/session";
import { useProgram, useWorkouts } from "@/lib/store";
import type { Program } from "@/types";

/**
 * Acciones comunes de programas: comenzar, abandonar, reiniciar y entrenar una sesión.
 * Las que piden confirmación devuelven `true` si se llevaron a cabo.
 */
export function useProgramActions() {
  const [progress, setProgress] = useProgram();
  const [workouts] = useWorkouts();
  const start = useStartWorkout();

  const begin = useCallback((program: Program) => {
    const active = progress ? programById(progress.programId) : undefined;
    if (active && active.id !== program.id
      && !window.confirm(`Ya sigues "${active.name}". ¿Quieres cambiarlo por "${program.name}"? Se perderá su avance.`)) return false;
    setProgress({ programId: program.id, startedAt: new Date().toISOString(), completed: [] });
    return true;
  }, [progress, setProgress]);

  const abandon = useCallback((program: Program) => {
    if (!window.confirm(`¿Abandonar "${program.name}"? Se borrará tu avance en el programa; tus entrenamientos quedan guardados.`)) return false;
    setProgress(null);
    return true;
  }, [setProgress]);

  const restart = useCallback((program: Program) => {
    if (!window.confirm(`¿Reiniciar "${program.name}" desde la semana 1?`)) return false;
    setProgress({ programId: program.id, startedAt: new Date().toISOString(), completed: [] });
    return true;
  }, [setProgress]);

  /** Entrena una sesión. Si el programa no está activo, primero lo activa (con confirmación) para que cuente el avance. */
  const startSession = useCallback((program: Program, week: number, day: number) => {
    if (progress?.programId !== program.id && !begin(program)) return;
    start({
      name: programSessionName(program, week, day),
      records: programSessionRecords(program, week, day, workouts),
      source: { type: "program", programId: program.id, week, day },
    });
  }, [begin, progress?.programId, start, workouts]);

  return { progress, begin, abandon, restart, startSession };
}
