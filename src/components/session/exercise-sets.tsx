"use client";

import { ArrowLeft, ArrowRight, ListOrdered, Minus, Plus, TrendingUp } from "lucide-react";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { suggestNext } from "@/lib/progression";
import type { ExerciseBests } from "@/lib/progression";
import { cn, toDisplayWeight } from "@/lib/utils";
import type { Exercise, ExerciseRecord, SetRecord } from "@/types";
import { SetListRow } from "./set-row";
import { isRecordSet, nextKind, performanceLabel, previousSet, setBadge } from "./session-utils";
import type { WeightUnit } from "./session-utils";

type Neighbour = { index: number; exercise: Exercise; record: ExerciseRecord } | null;

/**
 * Debajo del pliegue: la sugerencia de progresión, la nota, todas las series del ejercicio
 * (toca una para editarla arriba), agregar o quitar series y el paso al ejercicio siguiente.
 */
export function ExerciseSets({ recordIndex, record, exercise, last, bests, loadUnit, focusedSet, previousExercise, nextExercise, onFocus, onToggle, onSet, onAddSet, onRemoveSet, onGo, onOpenSession }: {
  recordIndex: number;
  record: ExerciseRecord;
  exercise: Exercise;
  last?: ExerciseRecord;
  bests: ExerciseBests;
  loadUnit: WeightUnit;
  focusedSet: number;
  previousExercise: Neighbour;
  nextExercise: Neighbour;
  onFocus: (setIndex: number) => void;
  onToggle: (recordIndex: number, setIndex: number) => void;
  onSet: (recordIndex: number, setIndex: number, patch: Partial<SetRecord>) => void;
  onAddSet: (recordIndex: number) => void;
  onRemoveSet: (recordIndex: number) => void;
  onGo: (index: number) => void;
  onOpenSession: () => void;
}) {
  const suggestion = suggestNext(exercise, last, loadUnit, (kg) => toDisplayWeight(kg, loadUnit));
  const done = record.sets.filter((set) => set.done).length;

  return (
    <section className="ses-sets" aria-labelledby="ses-sets-title">
      <div className="ses-sets-head">
        <h2 id="ses-sets-title">Series</h2>
        <span className="meta"><span className="num">{done}/{record.sets.length}</span> hechas</span>
      </div>

      <p className={cn("ses-hint", `hint-${suggestion.kind}`)}>
        <TrendingUp size={15} aria-hidden="true" />
        <span>{suggestion.message}</span>
      </p>

      <ol className="ses-rows" aria-label={`Series de ${exercise.name}`}>
        {record.sets.map((set, setIndex) => {
          const badge = setBadge(record.sets, setIndex);
          const previous = previousSet(record, setIndex, last);
          return (
            <SetListRow
              key={setIndex}
              set={set}
              badge={badge}
              label={`${exercise.name}, serie ${badge === "C" ? "de calentamiento" : badge}`}
              performance={performanceLabel(set, record.unit, loadUnit)}
              previous={previous ? performanceLabel(previous, record.unit, loadUnit) : undefined}
              isRecord={isRecordSet(set, record.unit, bests)}
              focused={setIndex === focusedSet}
              onFocus={() => onFocus(setIndex)}
              onToggle={() => onToggle(recordIndex, setIndex)}
              onCycleKind={() => onSet(recordIndex, setIndex, { kind: nextKind(set.kind) })}
            />
          );
        })}
      </ol>

      <div className="ses-rows-actions">
        <button type="button" className="ses-ghost ses-add-set" onClick={() => onAddSet(recordIndex)}><Plus size={17} /> Serie</button>
        <button type="button" className="ses-ghost ses-remove-set" onClick={() => onRemoveSet(recordIndex)} disabled={record.sets.length <= 1} aria-label="Quitar la última serie">
          <Minus size={17} />
        </button>
      </div>

      {nextExercise && (
        <button type="button" className="ses-next" onClick={() => onGo(nextExercise.index)}>
          <ExerciseVisual exercise={nextExercise.exercise} size="thumb" />
          <span className="ses-next-text">
            <span className="meta">Siguiente</span>
            <strong>{nextExercise.exercise.name}</strong>
            <small className="num">{nextExercise.record.sets.filter((set) => set.done).length}/{nextExercise.record.sets.length} series</small>
          </span>
          <ArrowRight size={19} aria-hidden="true" />
        </button>
      )}

      <div className="ses-sets-foot">
        {previousExercise && (
          <button type="button" className="ses-link" onClick={() => onGo(previousExercise.index)}>
            <ArrowLeft size={15} aria-hidden="true" /> {previousExercise.exercise.name}
          </button>
        )}
        <button type="button" className="ses-link" onClick={onOpenSession}><ListOrdered size={15} aria-hidden="true" /> Ver toda la sesión</button>
      </div>
    </section>
  );
}
