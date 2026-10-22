"use client";

import { useCallback, useMemo, useState } from "react";
import { muscleRecovery } from "@/lib/analytics";
import { availableEquipment, estimateMinutes, generateWorkout, levelFromActivities, suggestedFocus, todayGeneratorInput, todayLimitations, trainingGoal, trainingLevel } from "@/lib/generator";
import { buildTrainingPlan, planInputFor, planSession, todayPlanDay } from "@/lib/training-plan";
import type { WorkoutFocus } from "@/lib/generator";
import { nextProgramSession, programById, programSessionRecords, programTotalSessions, sessionKey } from "@/lib/programs";
import { carriedPain, recentHardStreak } from "@/lib/adaptation";
import { effortFor, progressedSets, recordAdjustments } from "@/lib/progression";
import { exerciseTrend, whyExercise } from "@/lib/selection";
import type { ExerciseWhy } from "@/lib/selection";
import { useFavorites, useNutritionProfile, usePreference, useProfile, useProgram, useReadiness, useSettings, useWorkouts } from "@/lib/store";
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
    sets: progressedSets(exercise, sets, lastRecordFor(workouts, exercise.id), effortFor(workouts, exercise.id)),
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
  const [favorites] = useFavorites();

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
  // Lo aprendido de tus últimas sesiones (molestias que marcaste al terminar y cansancio acumulado). Si hoy
  // hiciste el chequeo, manda el chequeo.
  const adaptation = useMemo(() => (hourNow ? { carriedPain: carriedPain(workouts, new Date(hourNow)), hardStreak: recentHardStreak(workouts, new Date(hourNow)) } : { carriedPain: [], hardStreak: 0 }), [hourNow, workouts]);
  const learnedShort = !readiness && (adaptation.carriedPain.length > 0 || adaptation.hardStreak >= 2);
  const recommendation = readiness?.recommendation ?? (learnedShort ? "short" : undefined);
  const suggested = suggestedFocus(recovery, recommendation);
  const minutes = minutesChoice ?? profile?.recommendation.sessionMinutes ?? 30;

  // Una sola sesión de hoy para Inicio y Entrenar (aquí se puede ajustar). Se arma con la hora en punto:
  // la semilla es del día y la recuperación cambia de hora en hora, así no se rehace cada minuto.
  const pain = readiness ? readiness.pain : adaptation.carriedPain.length ? adaptation.carriedPain : undefined;
  const avoid = settings.swappedOut;

  // Tu plan: la estructura semanal (Full Body A/B, Torso / Pierna…). Hoy toca el día que sigue en el ciclo;
  // si eliges otro enfoque o una zona, o tu chequeo pide recuperar, se arma la sesión como siempre.
  const trainingPlan = useMemo(() => {
    if (!hydrated) return null;
    return buildTrainingPlan(planInputFor({ profile, nutritionGoal: nutrition?.goal, settings, preference, workouts, favorites, bodyKg, now: hourNow }));
  }, [bodyKg, favorites, hydrated, hourNow, nutrition?.goal, preference, profile, settings, workouts]);
  const fromPlan = Boolean(trainingPlan) && focusChoice === null && !zone && recommendation !== "recovery";
  const planned = useMemo(() => {
    if (!fromPlan || !trainingPlan) return null;
    const base = planInputFor({ profile, nutritionGoal: nutrition?.goal, settings, preference, workouts, favorites, bodyKg, now: hourNow });
    const { day, note } = todayPlanDay(trainingPlan, workouts, hourNow, recovery);
    // Con un chequeo de molestias, otro tiempo o «Otra variante», el día se rearma con eso; si no, es el del plan.
    const adapted = Boolean(pain?.length) || minutesChoice !== null || variant > 0;
    const input = adapted ? { ...base, limitations: todayLimitations(profile?.limitations, pain), minutesOverride: minutesChoice ?? undefined, variant } : base;
    const work = adapted ? buildTrainingPlan(input) : trainingPlan;
    const chosen = work.days.find((item) => item.id === day.id) ?? day;
    return { session: planSession(input, work, chosen, { readiness: recommendation === "short" ? "short" : undefined }), day: chosen, note };
  }, [bodyKg, favorites, fromPlan, hourNow, minutesChoice, nutrition?.goal, pain, preference, profile, recommendation, recovery, settings, trainingPlan, variant, workouts]);
  const focus = focusChoice ?? planned?.session.focus ?? suggested;
  const plan = useMemo(() => {
    if (!hydrated) return null;
    if (planned) return planned.session;
    return generateWorkout(todayGeneratorInput({ profile, nutritionGoal: nutrition?.goal, preference, workouts, readiness: recommendation, pain, recovery, now: hourNow, minutes, focus, zone: zone ?? undefined, variant, bodyKg, avoid, favorites }));
  }, [avoid, bodyKg, favorites, hydrated, focus, minutes, hourNow, nutrition?.goal, pain, planned, preference, profile, recommendation, recovery, variant, workouts, zone]);
  const limitations = useMemo(() => todayLimitations(profile?.limitations, pain), [pain, profile?.limitations]);

  // La lista editable se reinicia cuando cambian las entradas del generador.
  const planKey = [zone ?? "", preference.location, preference.equipment.join(","), (preference.gymEquipment ?? []).join(","), JSON.stringify(preference.loads ?? {}), minutes, focus, variant, recommendation ?? "", (pain ?? []).join(","), nutrition?.goal ?? "", JSON.stringify(avoid ?? {}), favorites.join(","), planned?.day.id ?? "", trainingPlan?.split ?? "", workouts.length, todayKey].join("|");
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

  // Lo que PULSO cambió frente a tu última vez (carga, repeticiones o mantener), con su motivo.
  const adjustments = useMemo(() => recordAdjustments(records, workouts, settings.unit), [records, settings.unit, workouts]);
  // Por qué está cada ejercicio: el motivo del generador, o uno calculado para los que agregaste o cambiaste tú.
  const userLevel = useMemo(() => (hourNow ? trainingLevel(profile?.activities, workouts, new Date(hourNow)) : levelFromActivities(profile?.activities)), [hourNow, profile?.activities, workouts]);
  const whyFor = (exercise: Exercise): ExerciseWhy => plan?.why[exercise.id] ?? whyExercise(exercise, { location: preference.location, limitations, level: userLevel, trend: hourNow ? exerciseTrend(workouts, exercise.id, hourNow) : null, favorite: favorites.includes(exercise.id) });

  const exercises = records.map((record) => exerciseById(record.exerciseId)).filter((item): item is Exercise => Boolean(item));
  const primary = [...new Set(exercises.flatMap((exercise) => exercise.primary))];
  const secondary = [...new Set(exercises.flatMap((exercise) => exercise.secondary))].filter((muscle: MuscleGroup) => !primary.includes(muscle));
  // Dificultad de la sesión: el nivel promedio de sus ejercicios.
  const level = (exercises.length ? Math.min(3, Math.max(1, Math.round(exercises.reduce((sum, exercise) => sum + exercise.level, 0) / exercises.length))) : 1) as ExerciseLevel;

  return {
    ready: Boolean(plan),
    plan,
    trainingPlan,
    /** El día de «Tu plan» que toca hoy (null si armaste otro enfoque o una zona). */
    planDay: planned && trainingPlan ? { id: planned.day.id, name: planned.day.name, split: trainingPlan.label, note: planned.note } : null,
    name,
    focus,
    zone,
    suggested,
    minutes,
    variant,
    readiness,
    recovery,
    adaptation,
    records,
    adjustments,
    whyFor,
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
  const checkin = readinessEntries.find((entry) => entry.date === todayKey);
  const hour = Math.floor(now / HOUR) * HOUR;
  const carried = useMemo(() => (hour ? carriedPain(workouts, new Date(hour)) : []), [hour, workouts]);
  const pain = checkin ? checkin.pain : carried;
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
