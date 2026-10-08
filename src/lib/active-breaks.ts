import { breakMoveById, breakRoutines, type BreakMove, type BreakRoutine } from "@/data/active-breaks";

/** Pausas activas: los tramos de cada rutina, el registro del día y cuál conviene ahora. */

export interface BreakEntry {
  id: string;
  date: string;
  completedAt: string;
  routine: string;
}

export const BREAK_PREP_SECONDS = 5;
export const BREAK_SWITCH_SECONDS = 5;
const KEEP_DAYS = 120;

export interface BreakSegment {
  kind: "prep" | "move" | "switch";
  seconds: number;
  move: BreakMove;
  /** 1 o 2 en los movimientos por lado. */
  side?: 1 | 2;
  /** Posición del movimiento en la rutina (desde 0). */
  index: number;
}

/** Prepárate → movimiento (cada lado por separado) → «Sigue: …» → … */
export function breakSegments(routine: BreakRoutine): BreakSegment[] {
  const items = routine.items.flatMap((item) => {
    const move = breakMoveById.get(item.move);
    return move ? [{ move, seconds: item.seconds }] : [];
  });
  const segments: BreakSegment[] = [];
  items.forEach(({ move, seconds }, index) => {
    segments.push({ kind: index === 0 ? "prep" : "switch", seconds: index === 0 ? BREAK_PREP_SECONDS : BREAK_SWITCH_SECONDS, move, index });
    if (move.perSide) {
      const half = Math.round(seconds / 2);
      segments.push({ kind: "move", seconds: half, move, side: 1, index }, { kind: "move", seconds: seconds - half, move, side: 2, index });
    } else {
      segments.push({ kind: "move", seconds, move, index });
    }
  });
  return segments;
}

export function routineSeconds(routine: BreakRoutine) {
  return breakSegments(routine).reduce((sum, segment) => sum + segment.seconds, 0);
}

/** «3 min» redondeando al minuto. */
export function routineMinutes(routine: BreakRoutine) {
  return Math.max(1, Math.round(routineSeconds(routine) / 60));
}

export function breaksOn(entries: BreakEntry[], date: string) {
  return entries.filter((entry) => entry.date === date).length;
}

const ROTATION = ["cuello", "piernas", "espalda", "ojos"];

/** La primera de la rotación que aún no hiciste hoy; con todas hechas, la completa. */
export function suggestedRoutine(entries: BreakEntry[], today: string): BreakRoutine {
  const done = new Set(entries.filter((entry) => entry.date === today).map((entry) => entry.routine));
  const id = ROTATION.find((item) => !done.has(item)) ?? "completa";
  return breakRoutines.find((routine) => routine.id === id) ?? breakRoutines[0];
}

/** Guarda una pausa y descarta las de hace más de 120 días. */
export function addBreak(entries: BreakEntry[], entry: BreakEntry) {
  const limit = new Date(`${entry.date}T12:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() - KEEP_DAYS);
  const cutoff = limit.toISOString().slice(0, 10);
  return [...entries.filter((item) => item.date >= cutoff && item.id !== entry.id), entry];
}
