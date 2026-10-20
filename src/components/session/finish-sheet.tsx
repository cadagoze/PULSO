"use client";

import { useMemo, useState } from "react";
import { CircleAlert, Trophy } from "lucide-react";
import { Sheet, Switch } from "@/components/ui";
import { painOptions, painSafety, type PainArea } from "@/lib/readiness";
import { clockLabel, durationSeconds, exerciseById, recordsVolume, sessionSets } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import type { TrainingDraft, WorkoutEntry } from "@/types";
import { buildWorkoutEntry, effortChoices, volumeLabel } from "./session-utils";
import type { Effort, WeightUnit } from "./session-utils";

/** ¿Cómo te sentiste? Fácil, Bien o Difícil (se guarda como esfuerzo 2, 3 o 4). Lo comparten los intervalos. */
export function EffortPicker({ value, onChange }: { value: Effort; onChange: (value: Effort) => void }) {
  return (
    <fieldset className="ses-effort">
      <legend>¿Cómo te sentiste?</legend>
      <div className="ses-effort-grid">
        {effortChoices.map((option) => (
          <button key={option.value} type="button" className="ses-effort-chip" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * El cierre en una sola pantalla: minutos, series, volumen y récords, cómo te sentiste, molestias y
 * guardar. El reloj vive aquí, así no se repinta la sesión entera cada segundo mientras está abierta.
 */
export function FinishSheet({ open, onClose, draft, workouts, unit, onSave }: {
  open: boolean;
  onClose: () => void;
  draft: TrainingDraft;
  workouts: WorkoutEntry[];
  unit: WeightUnit;
  onSave: (effort: Effort, feltPain: boolean, painAreas: PainArea[]) => void;
}) {
  const [effort, setEffort] = useState<Effort>(3);
  const [pain, setPain] = useState(false);
  // Dónde molestó: la próxima sesión cuida esas zonas aunque no hagas el chequeo.
  const [areas, setAreas] = useState<PainArea[]>([]);
  const now = useNow(open ? 1000 : 60_000);
  const minute = useNow();
  const { done, total } = sessionSets(draft.records);
  const pending = total - done;
  const complete = done > 0 && pending === 0;
  // Récords que quedarán con este entrenamiento: la misma regla que el historial.
  const hits = useMemo(() => (open && minute ? buildWorkoutEntry(draft, workouts, { effort: 3, feltPain: false }, minute).prs ?? [] : []), [draft, minute, open, workouts]);
  const names = [...new Set(hits.map((hit) => exerciseById(hit.exerciseId)?.name).filter((name): name is string => Boolean(name)))];

  return (
    <Sheet open={open} onClose={onClose} title={complete ? "Entrenamiento completado" : "Terminar entrenamiento"} eyebrow={complete ? "Bien hecho" : "Antes de guardar"} className="ses-finish">
      <dl className={cn("ses-finish-stats", hits.length > 0 && "has-records")}>
        <div><dt className="meta">Duración</dt><dd className="num">{now ? clockLabel(durationSeconds(draft, now)) : "--:--"}</dd></div>
        <div><dt className="meta">Series</dt><dd className="num">{done}{pending > 0 && <small>/{total}</small>}</dd></div>
        <div><dt className="meta">Volumen</dt><dd className="num">{volumeLabel(recordsVolume(draft.records), unit)}</dd></div>
        {hits.length > 0 && <div className="is-gold"><dt className="meta">Récords</dt><dd className="num"><Trophy size={16} aria-hidden="true" />{hits.length}</dd></div>}
      </dl>
      {names.length > 0 && <p className="ses-finish-records">Récord personal en {names.join(", ")}.</p>}

      {pending > 0 && done > 0 && (
        <p className="notice warn">
          <CircleAlert size={18} />
          <span>Te quedan {pending} {pending === 1 ? "serie pendiente" : "series pendientes"}. Sólo se guardan las series hechas.</span>
        </p>
      )}
      {done === 0 && (
        <p className="notice danger">
          <CircleAlert size={18} />
          <span>Marca al menos una serie como hecha para poder guardar.</span>
        </p>
      )}

      <EffortPicker value={effort} onChange={setEffort} />

      <div className="toggle-row ses-pain">
        <span>
          <strong>Sentí molestias</strong>
          <small>{pain ? "¿Dónde? Tu próxima sesión cuidará esa zona." : "Queda en tu historial y tu próxima sesión lo tiene en cuenta."}</small>
        </span>
        <Switch checked={pain} onChange={setPain} label="Sentí molestias" />
      </div>
      {pain && (
        <div className="ses-pain-areas">
          <div className="chips" role="group" aria-label="Dónde molestó">
            {painOptions.map((option) => (
              <button key={option.value} type="button" className="chip" aria-pressed={areas.includes(option.value)} onClick={() => setAreas((current) => (current.includes(option.value) ? current.filter((area) => area !== option.value) : [...current, option.value]))}>{option.label}</button>
            ))}
          </div>
          <p className="ses-pain-safety">{painSafety}</p>
        </div>
      )}

      <div className="stack-s">
        <button type="button" className="btn btn-primary btn-large btn-block" disabled={done === 0} onClick={() => onSave(effort, pain, pain ? areas : [])}>
          Guardar entrenamiento
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>Seguir entrenando</button>
      </div>
    </Sheet>
  );
}
