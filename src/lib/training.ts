import { exercises } from "@/data/mock-data";
import type { ExerciseRecord, TrainingDraft, TrainingRoutine } from "@/types";

export function defaultRecords(short = false): ExerciseRecord[] {
  return (short ? exercises.slice(0, 3) : exercises).map((exercise) => ({
    exerciseId: exercise.id,
    unit: exercise.target.includes("repeticiones") ? "reps" : "seconds",
    sets: Array.from({ length: short ? 2 : exercise.sets }, () => ({
      value: parseInt(exercise.target) * (exercise.target.includes("minutos") ? 60 : 1), load: 0, done: false,
    })),
  }));
}
export const defaultRoutine: TrainingRoutine = { name: "Fuerza en casa", days: [0, 2, 4], restSeconds: 45, records: defaultRecords() };
export function completedSets(records: ExerciseRecord[]) { return records.reduce((sum, record) => sum + record.sets.filter((set) => set.done).length, 0); }
export function durationSeconds(draft: TrainingDraft, now: number) { return draft.elapsedSeconds + (draft.runningSince === null ? 0 : Math.max(0, Math.floor((now - draft.runningSince) / 1000))); }
export function clockLabel(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`; }
