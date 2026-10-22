import { warmupSets } from "@/lib/progression";
import { durationSeconds, exerciseById, hasPending, isWorkingSet, mainStarted } from "@/lib/training";
import type { Exercise, ExerciseRecord, SetRecord, TrainingDraft } from "@/types";
import { normalizeGroups } from "./session-utils";

/**
 * Cambios del entrenamiento en curso como funciones puras (sin React): la pantalla de la sesión sólo
 * decide cuándo aplicarlas. Así se pueden probar y el componente queda para componer la vista.
 */

/** Cambia una serie. Al cambiar la carga, se copia a las siguientes pendientes que tenían la carga anterior (como en Hevy). */
export function patchSet(record: ExerciseRecord, setIndex: number, patch: Partial<SetRecord>, carryFrom?: number): ExerciseRecord {
  const edited = record.sets[setIndex];
  const carry = carryFrom !== undefined && patch.load !== undefined && edited !== undefined && isWorkingSet(edited);
  return {
    ...record,
    sets: record.sets.map((set, index) => {
      if (index === setIndex) return { ...set, ...patch };
      if (carry && index > setIndex && !set.done && isWorkingSet(set) && set.load === carryFrom) return { ...set, load: patch.load ?? set.load };
      return set;
    }),
  };
}

/** Marca o desmarca una serie. */
export function markSet(records: ExerciseRecord[], recordIndex: number, setIndex: number, done: boolean): ExerciseRecord[] {
  return records.map((record, index) => (index !== recordIndex ? record : {
    ...record,
    sets: record.sets.map((set, position) => (position === setIndex ? { ...set, done } : set)),
  }));
}

/**
 * Segundos de descanso al completar una serie, o 0 si no corresponde: con descanso automático, fuera de
 * una superserie, con el reloj en marcha y si aún quedan series (tras la última toca terminar).
 */
export function restAfterSet(draft: TrainingDraft, recordIndex: number, records: ExerciseRecord[], autoRest: boolean) {
  const record = draft.records[recordIndex];
  const started = mainStarted(records);
  if (!record || !autoRest || draft.runningSince === null || !records.some((item) => hasPending(item, started))) return 0;
  const partner = draft.records[recordIndex + 1];
  const nextInSuperset = Boolean(record.group) && partner?.group === record.group && partner.sets.some((set) => !set.done);
  if (nextInSuperset) return 0;
  return Math.max(0, record.restSeconds ?? draft.restSeconds);
}

/**
 * Si en esta serie bajaste 3 o más repeticiones respecto de la anterior con la misma carga, te faltó
 * recuperarte: 30 s más de descanso antes de la siguiente. Con más carga, bajar es esperable. Devuelve
 * cuántas bajaste (0 si no aplica). `record` ya tiene la serie marcada como hecha.
 */
export function repDrop(record: ExerciseRecord, setIndex: number) {
  const set = record.sets[setIndex];
  if (!set?.done || record.unit !== "reps" || !isWorkingSet(set) || !record.sets.some((item) => !item.done)) return 0;
  const before = record.sets.slice(0, setIndex).filter((item) => item.done && isWorkingSet(item)).at(-1);
  const drop = before && Math.abs(set.load - before.load) < 0.01 ? before.value - set.value : 0;
  return drop >= 3 ? drop : 0;
}

/** Una serie más, copia de la última (las de calentamiento pasan a ser normales). */
export function withExtraSet(record: ExerciseRecord): ExerciseRecord {
  const last = record.sets[record.sets.length - 1];
  const copy: SetRecord = last
    ? { value: last.value, load: last.load, done: false, kind: last.kind === "warmup" ? "normal" : last.kind ?? "normal" }
    : { value: record.range?.[0] ?? exerciseById(record.exerciseId)?.range[0] ?? 10, load: 0, done: false, kind: "normal" };
  return { ...record, sets: [...record.sets, copy] };
}

/** Quita la última serie (siempre queda al menos una). */
export function withoutLastSet(record: ExerciseRecord): ExerciseRecord {
  return record.sets.length <= 1 ? record : { ...record, sets: record.sets.slice(0, -1) };
}

/** Pausa (guarda el tiempo y corta el descanso) o reanuda el reloj. */
export function togglePaused(draft: TrainingDraft, now: number): TrainingDraft {
  return draft.runningSince === null
    ? { ...draft, runningSince: now }
    : { ...draft, elapsedSeconds: durationSeconds(draft, now), runningSince: null, restUntil: null };
}

/** Suma o resta segundos al descanso en curso. */
export function adjustedRest(draft: TrainingDraft, delta: number, now: number): TrainingDraft {
  if (draft.restUntil === null) return draft;
  const until = Math.max(now, draft.restUntil + delta * 1000);
  return { ...draft, restUntil: until, restTotal: Math.max(1, (draft.restTotal ?? draft.restSeconds) + Math.max(0, delta)) };
}

/** Intercambia un ejercicio con el de al lado (las superseries se reacomodan). */
export function movedRecords(records: ExerciseRecord[], position: number, step: -1 | 1): ExerciseRecord[] {
  const target = position + step;
  if (target < 0 || target >= records.length) return records;
  const next = [...records];
  [next[position], next[target]] = [next[target], next[position]];
  return normalizeGroups(next);
}

/**
 * Series de aproximación para la carga de trabajo: las ya hechas primero, luego las que faltan (de menor
 * a mayor) y después las de trabajo. `missing` vacío: no hace falta (o ya se hicieron).
 */
export function withWarmups(record: ExerciseRecord, exercise: Exercise, barWeight: number) {
  const heaviest = Math.max(0, ...record.sets.filter(isWorkingSet).map((set) => set.load));
  const plan = warmupSets(heaviest, Boolean(exercise.barbell), barWeight);
  const doneWarmups = record.sets.filter((set) => set.kind === "warmup" && set.done);
  const missing = plan.filter((set) => !doneWarmups.some((done) => done.load === set.load));
  return {
    heaviest,
    planned: plan.length,
    missing: missing.length,
    record: missing.length ? { ...record, sets: [...doneWarmups, ...missing, ...record.sets.filter((set) => set.kind !== "warmup")] } : record,
  };
}
