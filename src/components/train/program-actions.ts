"use client";

import { useCallback } from "react";
import { availableEquipment, todayLimitations } from "@/lib/generator";
import { easierRecords, programById, programSessionName, programSessionRecords } from "@/lib/programs";
import { useStartWorkout } from "@/lib/session";
import { usePreference, useProfile, useProgram, useReadiness, useSettings, useWorkouts } from "@/lib/store";
import { localDateKey } from "@/lib/utils";
import { warmupFor, warmupRecords } from "@/lib/warmup";
import type { Program } from "@/types";
import { confirmAction } from "@/lib/confirm";

/**
 * Acciones comunes de programas: comenzar, abandonar, reiniciar y entrenar una sesión.
 * Las que piden confirmación devuelven (como promesa) `true` si se llevaron a cabo.
 */
export function useProgramActions() {
  const [progress, setProgress] = useProgram();
  const [workouts] = useWorkouts();
  const [profile] = useProfile();
  const [preference] = usePreference();
  const [readiness] = useReadiness();
  const [settings] = useSettings();
  const start = useStartWorkout();

  const begin = useCallback(async (program: Program) => {
    const active = progress ? programById(progress.programId) : undefined;
    if (active && active.id !== program.id
      && !(await confirmAction({ title: "¿Cambiar de programa?", message: `Ya sigues «${active.name}». Si lo cambias por «${program.name}», se perderá su avance.`, confirmLabel: "Cambiar programa" }))) return false;
    setProgress({ programId: program.id, startedAt: new Date().toISOString(), completed: [] });
    return true;
  }, [progress, setProgress]);

  const abandon = useCallback(async (program: Program) => {
    if (!(await confirmAction({ title: "¿Abandonar programa?", message: `Se borrará tu avance en «${program.name}». Tus entrenamientos quedan guardados.`, confirmLabel: "Abandonar", danger: true }))) return false;
    setProgress(null);
    return true;
  }, [setProgress]);

  const restart = useCallback(async (program: Program) => {
    if (!(await confirmAction({ title: "¿Reiniciar programa?", message: `«${program.name}» vuelve a la semana 1.`, confirmLabel: "Reiniciar" }))) return false;
    setProgress({ programId: program.id, startedAt: new Date().toISOString(), completed: [] });
    return true;
  }, [setProgress]);

  /**
   * Entrena una sesión. Si el programa no está activo, primero lo activa (con confirmación) para que cuente el avance.
   * Con `easier` (chequeo «cansado») cada ejercicio lleva una serie menos. Empieza con el calentamiento de esa
   * sesión (salvo que lo hayas quitado).
   */
  const startSession = useCallback(async (program: Program, week: number, day: number, { easier = false }: { easier?: boolean } = {}) => {
    if (progress?.programId !== program.id && !(await begin(program))) return;
    const records = programSessionRecords(program, week, day, workouts);
    const main = easier ? easierRecords(records) : records;
    const pain = readiness.find((entry) => entry.date === localDateKey())?.pain;
    const warmup = settings.warmup === false ? [] : warmupFor({ records: main, limitations: todayLimitations(profile?.limitations, pain), equipment: availableEquipment(preference), minutes: program.minutes });
    start({
      name: programSessionName(program, week, day),
      records: [...warmupRecords(warmup), ...main],
      source: { type: "program", programId: program.id, week, day },
    });
  }, [begin, preference, profile?.limitations, progress?.programId, readiness, settings.warmup, start, workouts]);

  return { progress, begin, abandon, restart, startSession };
}
