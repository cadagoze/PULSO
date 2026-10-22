import type { ExerciseRecord } from "@/types";

/**
 * Cuánto dura una sesión de verdad: lo que tardas en hacer las series, los descansos entre ellas y lo que
 * toma pasar de un ejercicio al siguiente. No es «6 ejercicios = 30 min»: las series pesadas con descansos
 * largos pesan mucho más que un aislamiento corto. El calentamiento cuenta como en su tarjeta: lo que
 * dura cada movimiento y los 15 s para cambiar de uno a otro.
 */

/** Segundos por repetición (bajada controlada y subida) y por preparar cada serie. */
const SECONDS_PER_REP = 3;
const SET_SETUP = 15;
/** Pasar al ejercicio siguiente: ir al sitio, ajustar el peso o el banco. */
const TRANSITION = 45;

/** Un movimiento del calentamiento: una sola serie de calentamiento, sin preparar peso ni cambiar de sitio. */
const isWarmup = (record: ExerciseRecord) => record.sets.length > 0 && record.sets.every((set) => set.kind === "warmup");

const execution = (record: ExerciseRecord, value: number) => {
  if (record.unit === "seconds") return value;
  return value * SECONDS_PER_REP + (isWarmup(record) ? 0 : SET_SETUP);
};

/**
 * Las superseries (ejercicios consecutivos con el mismo `group`) alternan sus series y descansan una sola
 * vez por vuelta: ahí está el tiempo que ahorran. Cada ejercicio paga su propia transición.
 */
function blocks(records: ExerciseRecord[]) {
  const result: ExerciseRecord[][] = [];
  for (const record of records) {
    const last = result[result.length - 1];
    if (record.group && last && last[0].group === record.group) last.push(record);
    else result.push([record]);
  }
  return result;
}

export function sessionSeconds(records: ExerciseRecord[], defaultRest: number) {
  return blocks(records).reduce((total, block) => {
    const rest = Math.max(...block.map((record) => record.restSeconds ?? defaultRest));
    const rounds = Math.max(...block.map((record) => record.sets.length));
    let seconds = 0;
    for (let round = 0; round < rounds; round += 1) {
      for (const record of block) {
        const set = record.sets[round];
        if (set) seconds += execution(record, set.value);
      }
      seconds += rest;
    }
    // Tras la última serie del bloque ya no hay descanso: se pasa al siguiente (en el calentamiento, con su descanso breve).
    return total + seconds - rest + (block.every(isWarmup) ? rest : TRANSITION) * block.length;
  }, 0);
}

export function estimateMinutes(records: ExerciseRecord[], restSeconds: number) {
  return Math.max(5, Math.round(sessionSeconds(records, restSeconds) / 60));
}
