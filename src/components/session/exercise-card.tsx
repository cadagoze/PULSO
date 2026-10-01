"use client";

import { memo } from "react";
import { Ellipsis, Link2, Minus, Plus, StickyNote, TrendingUp, X } from "lucide-react";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { suggestNext } from "@/lib/progression";
import type { ExerciseBests } from "@/lib/progression";
import { useNow } from "@/lib/use-now";
import { cn, fromDisplayWeight, toDisplayWeight } from "@/lib/utils";
import type { Exercise, ExerciseRecord, SetRecord } from "@/types";
import { SetRow } from "./set-row";
import { isRecordSet, limits, nextKind, previousLabel, previousSet, setBadge } from "./session-utils";

export type GroupPosition = "first" | "middle" | "last" | null;

function CountdownPrompt({ until, setLabel, onConfirm, onDismiss }: { until: number; setLabel: string; onConfirm: () => void; onDismiss: () => void }) {
  const now = useNow(500);
  if (now === 0 || now < until) return null;
  return (
    <div className="ses-countdown-done" role="status">
      <p>
        <b>Tiempo cumplido.</b> ¿Marcas la {setLabel} como hecha?
      </p>
      <div className="row">
        <button type="button" className="btn btn-primary btn-small" onClick={onConfirm}>Marcar hecha</button>
        <button type="button" className="btn-icon small" onClick={onDismiss} aria-label="Cerrar aviso"><X size={16} /></button>
      </div>
    </div>
  );
}

export interface ExerciseCardProps {
  index: number;
  record: ExerciseRecord;
  exercise: Exercise;
  last?: ExerciseRecord;
  bests: ExerciseBests;
  loadUnit: "kg" | "lb";
  groupLetter?: string;
  groupPosition: GroupPosition;
  countdown: { setIndex: number; until: number } | null;
  error: string | null;
  onSet: (recordIndex: number, setIndex: number, patch: Partial<SetRecord>, options?: { carryFrom?: number }) => void;
  onToggle: (recordIndex: number, setIndex: number) => void;
  onRir: (recordIndex: number, setIndex: number) => void;
  onCountdown: (recordIndex: number, setIndex: number) => void;
  onCountdownDismiss: () => void;
  onAddSet: (recordIndex: number) => void;
  onRemoveSet: (recordIndex: number) => void;
  onMenu: (recordIndex: number) => void;
}

function ExerciseCardBase(props: ExerciseCardProps) {
  const { index, record, exercise, last, bests, loadUnit, groupLetter, groupPosition, countdown, error } = props;
  const bodyweight = exercise.increment === 0;
  const suggestion = suggestNext(exercise, last, loadUnit, (kg) => toDisplayWeight(kg, loadUnit));
  const done = record.sets.filter((set) => set.done).length;
  const valueHead = record.unit === "reps" ? "REP" : "SEG";

  return (
    <article
      className={cn("ses-card", groupPosition && `ses-group ses-group-${groupPosition}`)}
      aria-label={exercise.name}
    >
      {groupLetter && groupPosition === "first" && (
        <p className="ses-group-tag"><Link2 size={13} /> Superserie {groupLetter} · alterna sin descanso</p>
      )}

      <header className="ses-card-head">
        <ExerciseVisual exercise={exercise} size="thumb" />
        <div className="ses-card-title">
          <h2>{exercise.name}</h2>
          <p>
            {exercise.muscle}
            <span className="ses-dot" aria-hidden="true">·</span>
            <span className="num">{done}/{record.sets.length}</span>
          </p>
        </div>
        <button
          type="button"
          className="btn-icon ses-card-menu"
          onClick={() => props.onMenu(index)}
          aria-label={`Opciones de ${exercise.name}`}
        >
          <Ellipsis size={20} />
        </button>
      </header>

      {record.note && (
        <p className="ses-card-note"><StickyNote size={14} /> {record.note}</p>
      )}

      <p className={cn("ses-hint", `hint-${suggestion.kind}`)}>
        <TrendingUp size={14} />
        <span>{suggestion.message}</span>
      </p>

      <div className="ses-table" role="group" aria-label={`Series de ${exercise.name}`}>
        <div className="ses-set ses-set-head" aria-hidden="true">
          <span>SERIE</span>
          <span>ANTERIOR</span>
          <span className={cn(bodyweight && "is-quiet")}>{bodyweight ? `+${loadUnit}` : loadUnit.toUpperCase()}</span>
          <span>{valueHead}</span>
          <span>{record.unit === "reps" ? "RIR" : ""}</span>
          <span />
        </div>
        {record.sets.map((set, setIndex) => {
          const previous = previousSet(record, setIndex, last);
          const badge = setBadge(record.sets, setIndex);
          const label = `${exercise.name}, serie ${badge === "C" ? "de calentamiento" : badge}`;
          const maxValue = record.unit === "reps" ? limits.reps : limits.seconds;
          return (
            <SetRow
              key={setIndex}
              set={set}
              badge={badge}
              label={label}
              unit={record.unit}
              loadUnit={loadUnit}
              displayLoad={toDisplayWeight(set.load, loadUnit)}
              bodyweight={bodyweight}
              previous={previous ? previousLabel(previous, record.unit, loadUnit) : undefined}
              invalidValue={set.value < 1 || set.value > maxValue}
              invalidLoad={set.load < 0 || set.load > limits.load}
              isRecord={isRecordSet(set, record.unit, bests)}
              countdownUntil={countdown?.setIndex === setIndex ? countdown.until : null}
              onValue={(value) => props.onSet(index, setIndex, { value })}
              onLoad={(display) => props.onSet(index, setIndex, { load: fromDisplayWeight(display, loadUnit) })}
              onLoadSettle={(display, initial) => props.onSet(index, setIndex, { load: fromDisplayWeight(display, loadUnit) }, { carryFrom: fromDisplayWeight(initial, loadUnit) })}
              onToggle={() => props.onToggle(index, setIndex)}
              onCycleKind={() => props.onSet(index, setIndex, { kind: nextKind(set.kind) })}
              onCopyPrevious={() => previous && props.onSet(index, setIndex, { value: previous.value, load: previous.load })}
              onRir={() => props.onRir(index, setIndex)}
              onCountdown={() => props.onCountdown(index, setIndex)}
            />
          );
        })}
      </div>

      {countdown && (
        <CountdownPrompt
          until={countdown.until}
          setLabel={`serie ${setBadge(record.sets, countdown.setIndex)}`}
          onConfirm={() => props.onToggle(index, countdown.setIndex)}
          onDismiss={props.onCountdownDismiss}
        />
      )}

      {error && <p className="form-error ses-card-error" role="alert">{error}</p>}

      <div className="ses-card-foot">
        <button type="button" className="ses-add-set" onClick={() => props.onAddSet(index)}>
          <Plus size={17} /> Serie
        </button>
        <button
          type="button"
          className="ses-remove-set"
          onClick={() => props.onRemoveSet(index)}
          disabled={record.sets.length <= 1}
          aria-label="Quitar la última serie"
        >
          <Minus size={17} />
        </button>
      </div>
    </article>
  );
}

export const ExerciseCard = memo(ExerciseCardBase);
