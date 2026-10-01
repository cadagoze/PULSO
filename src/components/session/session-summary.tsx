"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ClipboardCopy, Flame, Trophy } from "lucide-react";
import { MuscleMap } from "@/components/ui/muscle-map";
import { weekStreak, workoutMuscleSets } from "@/lib/analytics";
import { recordKindLabels } from "@/lib/progression";
import { exerciseById, isWorkingSet } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { formatLongDate, formatNumber, toDisplayWeight } from "@/lib/utils";
import type { MuscleGroup, Settings, WorkoutEntry } from "@/types";
import { minutesLabel, recordValueLabel, volumeLabel } from "./session-utils";

function bestSetLine(entry: WorkoutEntry, unit: "kg" | "lb") {
  return (entry.records ?? []).map((record) => {
    const name = exerciseById(record.exerciseId)?.name ?? "Ejercicio";
    const working = record.sets.filter(isWorkingSet);
    const sets = working.length ? working : record.sets;
    const top = [...sets].sort((a, b) => b.load - a.load || b.value - a.value)[0];
    const detail = !top ? "" : record.unit === "seconds"
      ? `${top.value} s`
      : top.load > 0 ? `${formatNumber(toDisplayWeight(top.load, unit))} ${unit} × ${top.value}` : `${top.value} rep`;
    return `• ${name}: ${sets.length} × ${detail}`;
  });
}

export function SessionSummary({ entry, workouts, settings }: { entry: WorkoutEntry; workouts: WorkoutEntry[]; settings: Settings }) {
  const now = useNow(60_000);
  const [copied, setCopied] = useState(false);
  const unit = settings.unit;
  const prs = entry.prs ?? [];

  const heat = useMemo(() => {
    const { sets } = workoutMuscleSets(entry);
    const max = Math.max(0, ...Object.values(sets));
    const values: Partial<Record<MuscleGroup, number>> = {};
    if (max > 0) for (const [muscle, value] of Object.entries(sets) as Array<[MuscleGroup, number]>) values[muscle] = value / max;
    return values;
  }, [entry]);

  const week = useMemo(() => (now ? weekStreak(workouts, settings.weeklyGoal, settings.pausedWeeks, new Date(now)) : null), [now, settings.pausedWeeks, settings.weeklyGoal, workouts]);

  async function copySummary() {
    const lines = [
      `PULSO · ${entry.name ?? "Entrenamiento"}`,
      formatLongDate(new Date(entry.completedAt)),
      `${minutesLabel(entry.durationMinutes)} · ${entry.sets} series · ${volumeLabel(entry.volume ?? 0, unit)}`,
      ...bestSetLine(entry, unit),
      ...(prs.length ? ["Récords:", ...prs.map((hit) => `★ ${exerciseById(hit.exerciseId)?.name ?? "Ejercicio"}: ${recordKindLabels[hit.kind]} ${recordValueLabel(hit.kind, hit.value, unit)}`)] : []),
      "Tu salud en movimiento.",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="ses-summary">
      <header className="ses-summary-hero">
        <span className="ses-summary-mark" aria-hidden="true"><Check size={34} strokeWidth={2.6} /></span>
        <p className="eyebrow">Entrenamiento guardado</p>
        <h1>{entry.name ?? "Buen trabajo"}</h1>
        <p className="ses-summary-sub">Bien hecho. Cada serie registrada suma a tu progreso.</p>
      </header>

      <div className="ses-summary-stats">
        <div><b className="num">{minutesLabel(entry.durationMinutes)}</b><span>duración</span></div>
        <div><b className="num">{entry.sets}</b><span>series</span></div>
        <div><b className="num">{volumeLabel(entry.volume ?? 0, unit)}</b><span>volumen</span></div>
        <div className={prs.length ? "is-highlight" : undefined}><b className="num">{prs.length}</b><span>{prs.length === 1 ? "récord" : "récords"}</span></div>
      </div>

      {week && (
        <p className="ses-summary-week">
          <Flame size={18} />
          <span>
            <b className="num">{week.currentCount}</b> de <b className="num">{settings.weeklyGoal}</b> sesiones esta semana
            {week.streak > 0 && <> · racha de <b className="num">{week.streak}</b> {week.streak === 1 ? "semana" : "semanas"}</>}
          </span>
        </p>
      )}

      {prs.length > 0 && (
        <section className="ses-summary-block">
          <h2>Récords personales</h2>
          <ul className="ses-pr-list">
            {prs.map((hit) => (
              <li key={`${hit.exerciseId}-${hit.kind}`}>
                <span className="ses-pr-icon"><Trophy size={17} /></span>
                <span className="grow">
                  <strong>{exerciseById(hit.exerciseId)?.name ?? "Ejercicio"}</strong>
                  <small>{recordKindLabels[hit.kind]} · antes {recordValueLabel(hit.kind, hit.previous, unit)}</small>
                </span>
                <b className="num">{recordValueLabel(hit.kind, hit.value, unit)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      {Object.keys(heat).length > 0 && (
        <section className="ses-summary-block">
          <h2>Músculos trabajados</h2>
          <MuscleMap mode="heat" values={heat} className="ses-summary-map" label="Músculos trabajados hoy" />
        </section>
      )}

      <div className="ses-summary-actions">
        <button type="button" className="btn btn-secondary btn-block" onClick={copySummary} aria-live="polite">
          {copied ? <><Check size={17} /> Resumen copiado</> : <><ClipboardCopy size={17} /> Copiar resumen</>}
        </button>
        <Link href="/progreso" className="btn btn-dark btn-block">Ver mi progreso</Link>
        <Link href="/" className="btn btn-primary btn-block">Volver a Hoy</Link>
      </div>
    </div>
  );
}
