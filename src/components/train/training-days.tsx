"use client";

import { useState } from "react";
import { SegmentedControl, Sheet, Stepper } from "@/components/ui";
import { useSettings } from "@/lib/store";
import { DAY_LETTERS, DAY_NAMES, cleanDays, daysLabel, suggestedDays } from "@/lib/training-days";

type Mode = "fixed" | "any";
const modeOptions: Array<{ value: Mode; label: string }> = [
  { value: "fixed", label: "Días fijos" },
  { value: "any", label: "Cualquier día" },
];
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Tus días de entreno: fijos (la meta semanal es la cantidad de días; los demás son descanso) o
 * cualquier día con una meta semanal. Se guarda al momento.
 */
export function TrainingDaysField({ onChange }: { onChange?: () => void }) {
  const [settings, update] = useSettings();
  const days = cleanDays(settings.trainingDays);
  const fixed = days.length > 0;

  function setMode(mode: Mode) {
    if (mode === "fixed" && !fixed) {
      const next = suggestedDays(settings.weeklyGoal);
      update({ trainingDays: next, weeklyGoal: next.length });
    } else if (mode === "any" && fixed) {
      update({ trainingDays: [] });
    }
    onChange?.();
  }

  function toggle(day: number) {
    const next = days.includes(day) ? days.filter((item) => item !== day) : [...days, day].sort((a, b) => a - b);
    if (!next.length) return;
    update({ trainingDays: next, weeklyGoal: next.length });
    onChange?.();
  }

  return (
    <div className="prof-field days-field">
      <div className="prof-field-text">
        <span className="prof-field-label">Tus días de entreno</span>
        <small>{fixed ? `${days.length} ${days.length === 1 ? "día" : "días"} por semana: es tu meta semanal. Los demás días son de descanso.` : "Entrenas cuando quieras: cuenta tu meta de días por semana."}</small>
      </div>
      <SegmentedControl<Mode> label="Cómo eliges tus días" options={modeOptions} value={fixed ? "fixed" : "any"} onChange={setMode} />
      {fixed ? (
        <div className="train-day-toggles days-toggles" role="group" aria-label="Días de entreno">
          {DAY_LETTERS.map((letter, day) => (
            <button key={letter + day} type="button" aria-pressed={days.includes(day)} onClick={() => toggle(day)}>
              <span aria-hidden="true">{letter}</span><span className="sr-only">{capitalize(DAY_NAMES[day])}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="prof-field prof-field-inline">
          <span className="prof-field-text"><span className="prof-field-label">Días por semana</span><small>Cada semana que lo cumples suma a tu racha.</small></span>
          <Stepper value={settings.weeklyGoal} onChange={(weeklyGoal) => { update({ weeklyGoal }); onChange?.(); }} min={1} max={7} label="días por semana" />
        </div>
      )}
    </div>
  );
}

/** Fila «Tus días: L · X · V» con hoja para cambiarlos (en Entrenar → Tu semana). */
export function TrainingDaysRow() {
  const [settings] = useSettings();
  const [open, setOpen] = useState(false);
  const days = cleanDays(settings.trainingDays);
  return (
    <>
      <button type="button" className="days-row pressable" onClick={() => setOpen(true)}>
        <span className="grow">
          <span className="meta">Tus días de entreno</span>
          <strong>{days.length ? daysLabel(days) : `Cualquier día · ${settings.weeklyGoal} por semana`}</strong>
        </span>
        <span className="days-row-action">Cambiar</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} eyebrow="Tu semana" title="Días de entreno">
        <div className="days-sheet">
          <TrainingDaysField />
          <p className="muted days-note">El aviso de «hora de entrenar» llega sólo tus días, y en Inicio los otros días se proponen como descanso activo.</p>
        </div>
      </Sheet>
    </>
  );
}
