import { useSyncExternalStore } from "react";
import { formatVolume } from "@/lib/analytics";
import { bestRepsAt, detectRecords, estimateOneRepMax, recordEligible } from "@/lib/progression";
import type { ExerciseBests } from "@/lib/progression";
import { completedSets, durationSeconds, isWorkingSet, newId, recordsVolume } from "@/lib/training";
import { formatNumber, localDateKey, toDisplayWeight } from "@/lib/utils";
import type { ExerciseRecord, PersonalRecordKind, SetKind, SetRecord, TrainingDraft, WorkoutEntry, WorkoutSource } from "@/types";

export type Effort = 1 | 2 | 3 | 4 | 5;
export type WeightUnit = "kg" | "lb";

export const effortOptions: Array<{ value: Effort; label: string }> = [
  { value: 1, label: "Muy fácil" },
  { value: 2, label: "Fácil" },
  { value: 3, label: "Moderado" },
  { value: 4, label: "Difícil" },
  { value: 5, label: "Máximo" },
];

export const rirOptions: Array<{ value: number; label: string }> = [
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4+" },
];

export const limits = { reps: 200, seconds: 3600, load: 500 } as const;

const subscribeNothing = () => () => {};

/** Verdadero sólo en el cliente tras hidratar: evita mostrar el estado vacío antes de leer localStorage. */
export function useHydrated() {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}

export function weightLabel(kg: number, unit: WeightUnit) {
  return `${formatNumber(toDisplayWeight(kg, unit))} ${unit}`;
}

export function volumeLabel(kg: number, unit: WeightUnit) {
  return unit === "kg" ? formatVolume(kg) : `${formatNumber(toDisplayWeight(kg, unit), 0)} lb`;
}

/** Acepta coma o punto decimal. Vacío = null. */
export function parseDecimal(text: string): number | null {
  const clean = text.trim().replace(",", ".");
  if (!clean) return null;
  const value = Number(clean);
  return Number.isFinite(value) ? value : null;
}

const kindCycle: SetKind[] = ["normal", "warmup", "failure", "drop"];

export function nextKind(kind: SetKind | undefined): SetKind {
  return kindCycle[(kindCycle.indexOf(kind ?? "normal") + 1) % kindCycle.length];
}

export const kindNames: Record<SetKind, string> = {
  normal: "serie normal",
  warmup: "calentamiento",
  failure: "al fallo",
  drop: "serie descendente (drop)",
};

/** Número visible de la serie: las de calentamiento muestran "C" y no cuentan. */
export function setBadge(sets: SetRecord[], index: number) {
  const set = sets[index];
  if (!set) return "";
  if (set.kind === "warmup") return "C";
  if (set.kind === "failure") return "F";
  if (set.kind === "drop") return "D";
  return String(sets.slice(0, index + 1).filter(isWorkingSet).length);
}

/** Serie equivalente de la sesión anterior (mismo tipo: calentamiento o trabajo, mismo orden). */
export function previousSet(record: ExerciseRecord, index: number, last?: ExerciseRecord): SetRecord | undefined {
  if (!last) return undefined;
  const working = isWorkingSet(record.sets[index]);
  const position = record.sets.slice(0, index).filter((set) => isWorkingSet(set) === working).length;
  return last.sets.filter((set) => isWorkingSet(set) === working)[position];
}

export function previousLabel(set: SetRecord, unit: "reps" | "seconds", weightUnit: WeightUnit) {
  if (unit === "seconds") return set.load > 0 ? `${formatNumber(toDisplayWeight(set.load, weightUnit))} × ${set.value} s` : `${set.value} s`;
  return set.load > 0 ? `${formatNumber(toDisplayWeight(set.load, weightUnit))} × ${set.value}` : `${set.value} rep`;
}

export function validateSet(set: SetRecord, unit: "reps" | "seconds"): string | null {
  const max = unit === "reps" ? limits.reps : limits.seconds;
  if (!Number.isFinite(set.value) || set.value < 1 || set.value > max) {
    return unit === "reps" ? "Las repeticiones van de 1 a 200." : "El tiempo va de 1 a 3600 segundos.";
  }
  if (!Number.isFinite(set.load) || set.load < 0 || set.load > limits.load) return "La carga va de 0 a 500 kg.";
  return null;
}

/** ¿Esta serie realizada supera la mejor marca previa del ejercicio? */
export function isRecordSet(set: SetRecord, unit: "reps" | "seconds", bests: ExerciseBests) {
  if (!recordEligible(set) || !bests.sessions.length) return false;
  if (unit === "seconds") return bests.seconds > 0 && set.value > bests.seconds;
  const e1rm = estimateOneRepMax(set.load, set.value);
  const repsBefore = bestRepsAt(bests, set.load);
  return (e1rm > 0 && bests.e1rm > 0 && e1rm > bests.e1rm + 0.01)
    || (set.load > 0 && bests.load > 0 && set.load > bests.load)
    || (repsBefore > 0 && set.value > repsBefore);
}

/** Los grupos de superserie sólo valen entre ejercicios contiguos; los sueltos se limpian. */
export function normalizeGroups(records: ExerciseRecord[]): ExerciseRecord[] {
  return records.map((record, index) => {
    if (!record.group) return record;
    const linked = records[index - 1]?.group === record.group || records[index + 1]?.group === record.group;
    if (linked) return record;
    const rest = { ...record };
    delete rest.group;
    return rest;
  });
}

/** Une el ejercicio con el siguiente, o los separa si ya estaban unidos. */
export function toggleSuperset(records: ExerciseRecord[], index: number): ExerciseRecord[] {
  const current = records[index];
  const next = records[index + 1];
  if (!current || !next) return records;
  if (current.group && current.group === next.group) {
    const fresh = newId("superserie");
    let end = index + 1;
    while (records[end + 1]?.group === current.group) end += 1;
    return normalizeGroups(records.map((record, position) => position > index && position <= end ? { ...record, group: fresh } : record));
  }
  const group = current.group ?? next.group ?? newId("superserie");
  return normalizeGroups(records.map((record, position) => position === index || position === index + 1 ? { ...record, group } : record));
}

/** Letra de cada superserie (A, B…) en orden de aparición. */
export function supersetLetters(records: ExerciseRecord[]) {
  const letters = new Map<string, string>();
  for (const record of records) {
    if (record.group && !letters.has(record.group)) letters.set(record.group, String.fromCharCode(65 + letters.size));
  }
  return letters;
}

export function sourceLabel(source?: WorkoutSource) {
  switch (source?.type) {
    case "program": return `Programa · semana ${source.week}`;
    case "routine": return "Rutina guardada";
    case "generated": return "Sesión sugerida";
    default: return "Entrenamiento libre";
  }
}

export function recordValueLabel(kind: PersonalRecordKind, value: number, unit: WeightUnit) {
  if (kind === "reps") return `${formatNumber(value, 0)} rep.`;
  if (kind === "seconds") return `${formatNumber(value, 0)} s`;
  if (kind === "volume") return volumeLabel(value, unit);
  return weightLabel(value, unit);
}

export function minutesLabel(minutes: number) {
  if (minutes < 1) return `${Math.max(0, Math.round(minutes * 60))} s`;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${Math.round(minutes % 60)} min`;
}

/** Entrenamiento listo para el historial: sólo series realizadas y ejercicios con al menos una. */
export function buildWorkoutEntry(draft: TrainingDraft, history: WorkoutEntry[], feedback: { effort: Effort; feltPain: boolean }, now: number): WorkoutEntry {
  const records = draft.records
    .map((record) => ({ ...record, sets: record.sets.filter((set) => set.done) }))
    .filter((record) => record.sets.length > 0);
  const minutes = Math.round(durationSeconds(draft, now) / 6) / 10;
  const stamp = new Date(now).toISOString();
  const entry: WorkoutEntry = {
    id: draft.id,
    name: draft.name,
    date: localDateKey(new Date(now)),
    completedAt: stamp,
    durationMinutes: minutes,
    exerciseCount: records.length,
    sets: completedSets(records),
    mode: "full",
    records,
    notes: draft.notes.trim() || undefined,
    effort: feedback.effort,
    feltPain: feedback.feltPain,
    feedbackAt: stamp,
    location: draft.location,
    equipment: draft.equipment,
    source: draft.source,
    volume: Math.round(recordsVolume(records) * 10) / 10,
    kind: "strength",
    load: Math.round(feedback.effort * 2 * minutes * 10) / 10,
  };
  return { ...entry, prs: detectRecords(entry, history) };
}
