"use client";

import { useMemo, useState } from "react";
import { muscleRecovery } from "@/lib/analytics";
import { estimateMinutes, focusLabels, generateWorkout, suggestedFocus, todayGeneratorInput } from "@/lib/generator";
import type { WorkoutFocus } from "@/lib/generator";
import { nextProgramSession, programById, programSessionRecords, programTotalSessions, sessionKey } from "@/lib/programs";
import { progressedSets } from "@/lib/progression";
import { useNutritionProfile, usePreference, useProfile, useProgram, useReadiness, useSettings, useWorkouts } from "@/lib/store";
import { exerciseById, lastRecordFor } from "@/lib/training";
import { localDateKey } from "@/lib/utils";
import type { Exercise, ExerciseRecord, MuscleGroup, WorkoutEntry } from "@/types";

const HOUR = 3_600_000;

/** De dónde sale la rutina de hoy: entrenamiento a medias, programa activo o sesión a tu medida. */
export type TodaySource = "draft" | "program" | "custom";

/** Registro para un ejercicio agregado o sustituido: series prellenadas con la progresión del historial. */
export function recordForExercise(exercise: Exercise, workouts: WorkoutEntry[], sets = exercise.sets, restSeconds?: number): ExerciseRecord {
  return {
    exerciseId: exercise.id,
    unit: exercise.unit,
    sets: progressedSets(exercise, sets, lastRecordFor(workouts, exercise.id)),
    ...(restSeconds ? { restSeconds } : {}),
  };
}

/**
 * Sesión generada para hoy. Usa las mismas entradas y la misma semilla que la portada de Inicio,
 * así «Personalizar» lleva a la misma sesión. Duración, enfoque, variante, calentamiento y ediciones
 * son locales a la pantalla (no se guardan).
 */
export function useTodayPlan(now: number) {
  const [profile] = useProfile();
  const [nutrition] = useNutritionProfile();
  const [workouts] = useWorkouts();
  const [readinessEntries] = useReadiness();
  const [preference] = usePreference();
  const [settings] = useSettings();

  const [minutesChoice, setMinutesChoice] = useState<number | null>(null);
  const [focusChoice, setFocusChoice] = useState<WorkoutFocus | null>(null);
  const [variant, setVariant] = useState(0);
  const [includeWarmup, setIncludeWarmup] = useState(true);
  const [edits, setEdits] = useState<{ key: string; records: ExerciseRecord[] } | null>(null);

  const hydrated = now !== 0;
  const hourNow = Math.floor(now / HOUR) * HOUR;
  const todayKey = hydrated ? localDateKey(new Date(now)) : "";
  const readiness = readinessEntries.find((entry) => entry.date === todayKey);
  const recovery = useMemo(() => (hourNow ? muscleRecovery(workouts, hourNow) : undefined), [hourNow, workouts]);
  const suggested = suggestedFocus(recovery, readiness?.recommendation);
  const focus = focusChoice ?? suggested;
  const minutes = minutesChoice ?? profile?.recommendation.sessionMinutes ?? 30;

  // Mismas entradas que la portada de Inicio (ver todayGeneratorInput); aquí se pueden ajustar.
  const plan = useMemo(() => {
    if (!hydrated) return null;
    return generateWorkout(todayGeneratorInput({ profile, nutritionGoal: nutrition?.goal, preference, workouts, readiness: readiness?.recommendation, recovery, now, minutes, focus, variant }));
  }, [hydrated, focus, minutes, now, nutrition?.goal, preference, profile, readiness?.recommendation, recovery, variant, workouts]);

  // La lista editable se reinicia cuando cambian las entradas del generador.
  const planKey = [preference.location, preference.equipment.join(","), (preference.gymEquipment ?? []).join(","), minutes, focus, variant, readiness?.recommendation ?? "", nutrition?.goal ?? "", workouts.length, todayKey].join("|");
  const edited = edits !== null && edits.key === planKey;
  const records = edited ? edits.records : plan?.records ?? [];

  function editRecords(update: (current: ExerciseRecord[]) => ExerciseRecord[]) {
    setEdits({ key: planKey, records: update(records) });
  }

  const warmup = plan?.warmup ?? [];
  const warmupRecords: ExerciseRecord[] = includeWarmup
    ? warmup.map((exercise) => ({ exerciseId: exercise.id, unit: "seconds", sets: [{ value: 30, load: 0, done: false, kind: "warmup" }], restSeconds: 15 }))
    : [];
  const fullRecords = [...warmupRecords, ...records];
  const restSeconds = plan?.restSeconds ?? settings.defaultRest;
  const estimated = estimateMinutes(fullRecords, restSeconds);
  const name = plan ? `${focusLabels[focus]} · ${minutes} min` : "Entrenamiento de hoy";

  const exercises = records.map((record) => exerciseById(record.exerciseId)).filter((item): item is Exercise => Boolean(item));
  const primary = [...new Set(exercises.flatMap((exercise) => exercise.primary))];
  const secondary = [...new Set(exercises.flatMap((exercise) => exercise.secondary))].filter((muscle: MuscleGroup) => !primary.includes(muscle));

  return {
    ready: Boolean(plan),
    plan,
    name,
    focus,
    suggested,
    minutes,
    variant,
    readiness,
    records,
    warmup,
    fullRecords,
    restSeconds,
    estimated,
    edited,
    primary,
    secondary,
    includeWarmup,
    workouts,
    setIncludeWarmup,
    setMinutes: setMinutesChoice,
    setFocus: setFocusChoice,
    reroll: () => setVariant((value) => value + 1),
    editRecords,
    resetEdits: () => setEdits(null),
  };
}

export type TodayPlan = ReturnType<typeof useTodayPlan>;

/** Programa activo: próxima sesión (como en Inicio), avance total y de la semana en curso. */
export function useActiveProgram() {
  const [progress] = useProgram();
  const [workouts] = useWorkouts();
  const program = progress ? programById(progress.programId) : undefined;
  const next = program && progress ? nextProgramSession(program, progress) : null;
  const week = next?.week;
  const day = next?.day;
  const records = useMemo(
    () => (program && week && day ? programSessionRecords(program, week, day, workouts) : []),
    [program, week, day, workouts],
  );
  if (!program || !progress) return null;
  const completed = progress.completed;
  const weekDone = week ? program.days.filter((_, index) => completed.includes(sessionKey(week, index + 1))).length : program.days.length;
  return {
    program,
    next,
    day: next ? program.days[next.day - 1] : undefined,
    records,
    done: completed.length,
    total: programTotalSessions(program),
    weekDone,
  };
}

export type ActiveProgram = NonNullable<ReturnType<typeof useActiveProgram>>;
