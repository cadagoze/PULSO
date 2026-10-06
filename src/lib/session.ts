"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { primeAudio } from "@/lib/feedback";
import { useDraft, usePreference, useSettings } from "@/lib/store";
import { newId } from "@/lib/training";
import type { ExerciseRecord, TrainingDraft, TrainingPreference, WorkoutSource } from "@/types";
import { confirmAction } from "@/lib/confirm";

export interface StartWorkoutInput {
  name: string;
  records: ExerciseRecord[];
  restSeconds?: number;
  source: WorkoutSource;
}

export function createDraft(input: StartWorkoutInput, preference: TrainingPreference, defaultRest: number, now = Date.now()): TrainingDraft {
  return {
    id: newId("sesion"),
    name: input.name,
    records: input.records.map((record) => ({ ...record, sets: record.sets.map((set) => ({ ...set, done: false })) })),
    elapsedSeconds: 0,
    runningSince: now,
    restUntil: null,
    notes: "",
    restSeconds: input.restSeconds ?? defaultRest,
    location: preference.location,
    equipment: preference.equipment,
    source: input.source,
    startedAt: new Date(now).toISOString(),
  };
}

/** Inicia (o reemplaza, tras confirmar) el entrenamiento en curso y abre la pantalla de registro. */
export function useStartWorkout() {
  const router = useRouter();
  const [draft, setDraft] = useDraft();
  const [preference] = usePreference();
  const [settings] = useSettings();
  return useCallback(async (input: StartWorkoutInput) => {
    if (draft && !(await confirmAction({ title: "Ya tienes un entrenamiento en curso", message: `Si comienzas «${input.name}», se descarta «${draft.name}».`, confirmLabel: "Descartar y comenzar", cancelLabel: "Volver al que tengo", danger: true }))) {
      router.push("/entrenar/sesion");
      return;
    }
    primeAudio();
    setDraft(createDraft(input, preference, settings.defaultRest));
    router.push("/entrenar/sesion");
  }, [draft, preference, router, setDraft, settings.defaultRest]);
}
