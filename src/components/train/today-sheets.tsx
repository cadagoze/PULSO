"use client";

import Link from "@/components/ui/app-link";
import { useState } from "react";
import { ArrowRight, Info, Minus, Plus, Shuffle, Zap } from "lucide-react";
import { Button, MetaLine, SegmentedControl, Sheet } from "@/components/ui";
import { durationOptions, focusLabels } from "@/lib/generator";
import type { WorkoutFocus } from "@/lib/generator";
import { suggestNext } from "@/lib/progression";
import { useSettings } from "@/lib/store";
import { lastRecordFor } from "@/lib/training";
import { cn, formatNumber, fromDisplayWeight, toDisplayWeight } from "@/lib/utils";
import { loadStep, targetLabel, topLoad } from "@/components/train/shared";
import type { TodayPlan } from "@/components/train/today-plan";
import type { Exercise, ExerciseRecord, ReadinessEntry } from "@/types";

const durations = durationOptions.map((value) => ({ value: String(value), label: `${value} min` }));
const focuses = Object.keys(focusLabels) as WorkoutFocus[];

const readinessText: Record<ReadinessEntry["recommendation"], string> = {
  planned: "Listo para lo planificado",
  short: "Mejor una sesión corta",
  recovery: "Día para recuperar",
};

/** Duración, enfoque y variante de la sesión a tu medida. Los cambios se ven al instante en la tarjeta. */
export function AdjustSheet({ open, onClose, today }: { open: boolean; onClose: () => void; today: TodayPlan }) {
  const entry = today.readiness;
  return (
    <Sheet open={open} onClose={onClose} eyebrow="Tu rutina de hoy" title="Ajustar sesión" className="train-adjust">
      <MetaLine
        className="train-adjust-summary"
        items={[focusLabels[today.focus], <><b className="num">{today.records.length}</b> ejercicios</>, <><b className="num">{today.estimated}</b> min</>]}
      />
      <div className="train-field">
        <p className="train-field-label">Duración</p>
        <SegmentedControl options={durations} value={String(today.minutes)} onChange={(value) => today.setMinutes(Number(value))} label="Duración de la sesión" />
      </div>
      <div className="train-field">
        <p className="train-field-label">Enfoque</p>
        <div className="chips train-focus">
          {focuses.map((option) => (
            <button key={option} type="button" className="chip" aria-pressed={today.focus === option} onClick={() => today.setFocus(option)}>
              {focusLabels[option]}
              {option === today.suggested && <span className="train-suggested">Sugerido</span>}
            </button>
          ))}
        </div>
      </div>
      {entry ? (
        <div className="train-readiness" data-tone={entry.recommendation}>
          <span className="train-readiness-score num">{entry.score}</span>
          <span className="grow">
            <strong>Preparación de hoy</strong>
            <small>{readinessText[entry.recommendation]} · el enfoque sugerido la tiene en cuenta</small>
          </span>
        </div>
      ) : (
        <Link href="/" className="train-readiness missing" onClick={onClose}>
          <span className="train-readiness-icon" aria-hidden="true"><Zap size={16} /></span>
          <span className="grow">
            <strong>¿Cómo llegas hoy?</strong>
            <small>Haz el chequeo en Inicio y ajustamos la sesión</small>
          </span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
      <div className="train-sheet-actions">
        <Button variant="secondary" onClick={today.reroll}>
          <Shuffle size={16} />
          Otra variante
        </Button>
        <Button onClick={onClose}>Listo</Button>
      </div>
    </Sheet>
  );
}

/**
 * Carga de un ejercicio de la sesión: número grande que sube o baja con cada toque.
 * Se guarda en kg y se muestra en la unidad del usuario; se aplica a todas las series.
 */
export function LoadSheet({ open, onClose, exercise, record, workouts, onChange }: {
  open: boolean;
  onClose: () => void;
  exercise?: Exercise;
  record?: ExerciseRecord;
  workouts: TodayPlan["workouts"];
  onChange: (kg: number) => void;
}) {
  const [settings] = useSettings();
  const [direction, setDirection] = useState<"up" | "down">("up");
  const unit = settings.unit;
  const display = record ? toDisplayWeight(topLoad(record), unit) : 0;
  const step = exercise ? loadStep(exercise, unit) : 1;
  const max = unit === "lb" ? 660 : 300;
  const suggestion = exercise ? suggestNext(exercise, lastRecordFor(workouts, exercise.id), unit, (kg) => toDisplayWeight(kg, unit)) : null;

  function change(delta: number) {
    const next = Math.max(0, Math.min(max, Math.round((display + delta) * 100) / 100));
    if (next === display) return;
    setDirection(delta > 0 ? "up" : "down");
    onChange(fromDisplayWeight(next, unit));
  }

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Carga de trabajo" title={exercise?.name ?? "Carga"} className="train-load-sheet">
      {exercise && record && (
        <>
          <div className="train-load-control" role="group" aria-label={`Carga de ${exercise.name}`}>
            <button type="button" className="train-load-step" onClick={() => change(-step)} disabled={display <= 0} aria-label={`Bajar ${formatNumber(step)} ${unit}`}>
              <Minus size={22} />
            </button>
            <output className="train-load-value" aria-live="polite">
              <span key={display} className={cn("num-display", "train-tick", direction === "down" && "is-down")}>{formatNumber(display)}</span>
              <span className="train-load-unit">{unit}</span>
            </output>
            <button type="button" className="train-load-step" onClick={() => change(step)} disabled={display >= max} aria-label={`Subir ${formatNumber(step)} ${unit}`}>
              <Plus size={22} />
            </button>
          </div>
          <p className="train-load-caption num">
            {display > 0 ? `En las ${record.sets.length} series · ${targetLabel(exercise, record.sets.length, record.range)}` : "Sin carga definida: elige una para tus series"}
          </p>
          {suggestion && (
            <div className="notice">
              <Info size={18} />
              <p>{suggestion.message}</p>
            </div>
          )}
          <Button size="l" block onClick={onClose}>Listo</Button>
        </>
      )}
    </Sheet>
  );
}
