"use client";

import { useCallback, useMemo, useState } from "react";
import { muscleRecovery } from "@/lib/analytics";
import { availableEquipment, estimateMinutes, generateWorkout, suggestedFocus, todayGeneratorInput, todayLimitations, trainingGoal } from "@/lib/generator";
import type { WorkoutFocus } from "@/lib/generator";
import { nextProgramSession, programById, programSessionRecords, programTotalSessions, sessionKey } from "@/lib/programs";
import { progressedSets } from "@/lib/progression";
import { useNutritionProfile, usePreference, useProfile, useProgram, useReadiness, useSettings, useWorkouts } from "@/lib/store";
import { exerciseById, lastRecordFor } from "@/lib/training";
import { localDateKey } from "@/lib/utils";
import { SHORT_MINUTES, shortVersion } from "@/lib/short-session";
import { warmupFor, warmupRecords } from "@/lib/warmup";
import type { Exercise, ExerciseLevel, ExerciseRecord, MuscleGroup, WorkoutEntry } from "@/types";
import { useLatestWeight } from "@/lib/use-nutrition";
import { zoneById, type BodyZone } from "@/data/body-zones";

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
 * así «Personalizar» lleva a la misma sesión. Duración, enfoque, variante y ediciones son locales a la
 * pantalla (no se guardan); incluir el calentamiento es un ajuste (vale para Inicio, Entrenar y programas).
 */
export function useTodayPlan(now: number, initialZone?: string | null) {
  const [profile] = useProfile();
  const [nutrition] = useNutritionProfile();
  const bodyKg = useLatestWeight();
  const [workouts] = useWorkouts();
  const [readinessEntries] = useReadiness();
  const [preference] = usePreference();
  const [settings, updateSettings] = useSettings();

  const [minutesChoice, setMinutesChoice] = useState<number | null>(null);
  const [focusChoice, setFocusChoice] = useState<WorkoutFocus | null>(null);
  // Zona del cuerpo elegida (glúteos, brazos…): manda sobre el enfoque mientras esté puesta.
  const [zone, setZone] = useState<BodyZone | null>(() => zoneById(initialZone)?.id ?? null);
  const [variant, setVariant] = useState(0);
  // «¿Poco tiempo?»: la misma sesión en su versión de 20 minutos (lo de mayor impacto).
  const [short, setShort] = useState(false);
  const [edits, setEdits] = useState<{ key: string; records: ExerciseRecord[] } | null>(null);

  const hydrated = now !== 0;
  const hourNow = Math.floor(now / HOUR) * HOUR;
  const todayKey = hydrated ? localDateKey(new Date(now)) : "";
  const readiness = readinessEntries.find((entry) => entry.date === todayKey);
  const recovery = useMemo(() => (hourNow ? muscleRecovery(workouts, hourNow) : undefined), [hourNow, workouts]);
  const suggested = suggestedFocus(recovery, readiness?.recommendation);
  const focus = focusChoice ?? suggested;
  const minutes = minutesChoice ?? profile?.recommendation.sessionMinutes ?? 30;

  // Una sola sesión de hoy para Inicio y Entrenar (aquí se puede ajustar). Se arma con la hora en punto:
  // la semilla es del día y la recuperación cambia de hora en hora, así no se rehace cada minuto.
  const pain = readiness?.pain;
  const plan = useMemo(() => {
    if (!hydrated) return null;
    return generateWorkout(todayGeneratorInput({ profile, nutritionGoal: nutrition?.goal, preference, workouts, readiness: readiness?.recommendation, pain, recovery, now: hourNow, minutes, focus, zone: zone ?? undefined, variant, bodyKg }));
  }, [bodyKg, hydrated, focus, minutes, hourNow, nutrition?.goal, pain, preference, profile, readiness?.recommendation, recovery, variant, workouts, zone]);
  const limitations = useMemo(() => todayLimitations(profile?.limitations, pain), [pain, profile?.limitations]);

  // La lista editable se reinicia cuando cambian las entradas del generador.
  const planKey = [zone ?? "", preference.location, preference.equipment.join(","), (preference.gymEquipment ?? []).join(","), JSON.stringify(preference.loads ?? {}), minutes, focus, variant, readiness?.recommendation ?? "", (pain ?? []).join(","), nutrition?.goal ?? "", workouts.length, todayKey].join("|");
  const edited = edits !== null && edits.key === planKey;
  const baseRecords = useMemo(() => (edits !== null && edits.key === planKey ? edits.records : plan?.records ?? []), [edits, plan, planKey]);
  const restSeconds = plan?.restSeconds ?? settings.defaultRest;
  const includeWarmup = settings.warmup !== false;
  const records = useMemo(() => (short ? shortVersion(baseRecords, restSeconds, { warmup: includeWarmup }) : baseRecords), [baseRecords, includeWarmup, restSeconds, short]);

  function editRecords(update: (current: ExerciseRecord[]) => ExerciseRecord[]) {
    setEdits({ key: planKey, records: update(baseRecords) });
  }

  // Calentamiento para lo que de verdad vas a hacer (también con tus cambios); la sesión de movilidad no lo lleva.
  const warmupOf = useCallback((list: ExerciseRecord[], length: number) => {
    if (!plan || plan.focus === "mobility") return [];
    return warmupFor({ records: list, limitations, equipment: availableEquipment(preference), minutes: length });
  }, [limitations, plan, preference]);
  const warmup = useMemo(() => warmupOf(records, short ? SHORT_MINUTES : minutes), [minutes, records, short, warmupOf]);
  const fullRecords = [...(includeWarmup ? warmupRecords(warmup) : []), ...records];
  const estimated = estimateMinutes(fullRecords, restSeconds);
  // Lo que dura la sesión completa (para ofrecer la versión corta sólo cuando ahorra tiempo de verdad).
  const fullEstimated = useMemo(() => (short ? estimateMinutes([...(includeWarmup ? warmupRecords(warmupOf(baseRecords, minutes)) : []), ...baseRecords], restSeconds) : estimated), [baseRecords, estimated, includeWarmup, minutes, restSeconds, short, warmupOf]);
  const name = plan ? plan.name : "Entrenamiento de hoy";

  const exercises = records.map((record) => exerciseById(record.exerciseId)).filter((item): item is Exercise => Boolean(item));
  const primary = [...new Set(exercises.flatMap((exercise) => exercise.primary))];
  const secondary = [...new Set(exercises.flatMap((exercise) => exercise.secondary))].filter((muscle: MuscleGroup) => !primary.includes(muscle));
  // Dificultad de la sesión: el nivel promedio de sus ejercicios.
  const level = (exercises.length ? Math.min(3, Math.max(1, Math.round(exercises.reduce((sum, exercise) => sum + exercise.level, 0) / exercises.length))) : 1) as ExerciseLevel;

  return {
    ready: Boolean(plan),
    plan,
    name,
    focus,
    zone,
    suggested,
    minutes,
    variant,
    readiness,
    recovery,
    records,
    warmup,
    fullRecords,
    restSeconds,
    estimated,
    fullEstimated,
    fullCount: baseRecords.length,
    short,
    setShort,
    edited,
    primary,
    secondary,
    level,
    goal: trainingGoal(profile?.goals, nutrition?.goal),
    includeWarmup,
    workouts,
    setIncludeWarmup: (on: boolean) => updateSettings({ warmup: on }),
    setMinutes: setMinutesChoice,
    setFocus: (value: WorkoutFocus | null) => { setZone(null); setFocusChoice(value); },
    setZone,
    reroll: () => setVariant((value) => value + 1),
    editRecords,
    resetEdits: () => setEdits(null),
  };
}

export type TodayPlan = ReturnType<typeof useTodayPlan>;

/** Programa activo: próxima sesión (como en Inicio, con su calentamiento), avance total y de la semana en curso. */
export function useActiveProgram(now: number) {
  const [progress] = useProgram();
  const [workouts] = useWorkouts();
  const [profile] = useProfile();
  const [preference] = usePreference();
  const [readinessEntries] = useReadiness();
  const program = progress ? programById(progress.programId) : undefined;
  const next = program && progress ? nextProgramSession(program, progress) : null;
  const week = next?.week;
  const day = next?.day;
  const records = useMemo(
    () => (program && week && day ? programSessionRecords(program, week, day, workouts) : []),
    [program, week, day, workouts],
  );
  const todayKey = now ? localDateKey(new Date(now)) : "";
  const pain = readinessEntries.find((entry) => entry.date === todayKey)?.pain;
  const warmup = useMemo(
    () => (program && records.length ? warmupFor({ records, limitations: todayLimitations(profile?.limitations, pain), equipment: availableEquipment(preference), minutes: program.minutes }) : []),
    [pain, preference, profile?.limitations, program, records],
  );
  if (!program || !progress) return null;
  const completed = progress.completed;
  const weekDone = week ? program.days.filter((_, index) => completed.includes(sessionKey(week, index + 1))).length : program.days.length;
  return {
    program,
    next,
    day: next ? program.days[next.day - 1] : undefined,
    records,
    warmup,
    done: completed.length,
    total: programTotalSessions(program),
    weekDone,
  };
}

export type ActiveProgram = NonNullable<ReturnType<typeof useActiveProgram>>;
