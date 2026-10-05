"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Activity, Check, ClipboardCopy, Flame, Trophy } from "lucide-react";
import { MuscleMap } from "@/components/ui/muscle-map";
import { weekStreak, workoutMuscleSets } from "@/lib/analytics";
import { sessionCalories } from "@/lib/energy";
import { formatKcal } from "@/lib/nutrition";
import { recordKindLabels } from "@/lib/progression";
import { exerciseById, isWorkingSet } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { useLatestWeight } from "@/lib/use-nutrition";
import { cn, formatLongDate, formatNumber, toDisplayWeight } from "@/lib/utils";
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

/** «42 min» → ["42", "min"]; «1 h 5 min» → ["1:05", "h"]: la cifra va en grande y la unidad, pequeña. */
function durationParts(minutes: number): [string, string] {
  if (minutes < 1) return [String(Math.max(0, Math.round(minutes * 60))), "s"];
  if (minutes < 60) return [String(Math.round(minutes)), "min"];
  const hours = Math.floor(minutes / 60);
  return [`${hours}:${String(Math.round(minutes % 60)).padStart(2, "0")}`, "h"];
}

function splitUnit(label: string): [string, string] {
  const at = label.lastIndexOf(" ");
  return at < 0 ? [label, ""] : [label.slice(0, at), label.slice(at + 1)];
}

function Figure({ label, value, unit, tone, index }: { label: string; value: ReactNode; unit?: string; tone?: "orange"; index: number }) {
  return (
    <div className={cn("ses-summary-figure rise", tone === "orange" && "is-orange")} style={{ "--i": index + 2 } as CSSProperties}>
      <dt className="meta">{label}</dt>
      <dd><span className="num-display">{value}</span>{unit && <small>{unit}</small>}</dd>
    </div>
  );
}

/** Resumen al guardar: estado especial con atmósfera y grano, cifras editoriales y récords en naranja. */
export function SessionSummary({ entry, workouts, settings }: { entry: WorkoutEntry; workouts: WorkoutEntry[]; settings: Settings }) {
  const now = useNow(60_000);
  const [copied, setCopied] = useState(false);
  const unit = settings.unit;
  const prs = entry.prs ?? [];
  const [duration, durationUnit] = durationParts(entry.durationMinutes);
  const [volume, volumeUnit] = splitUnit(volumeLabel(entry.volume ?? 0, unit));
  const weightKg = useLatestWeight();
  const kcal = weightKg ? sessionCalories(entry, weightKg) : 0;

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
      `${minutesLabel(entry.durationMinutes)} · ${entry.sets} series · ${volumeLabel(entry.volume ?? 0, unit)}${kcal > 0 ? ` · ≈ ${formatKcal(kcal)} kcal` : ""}`,
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
      <div className="ses-summary-bg atmosphere grain" aria-hidden="true" />
      <div className="ses-summary-inner">
        <header className="ses-summary-hero">
          <span className="ses-summary-mark" aria-hidden="true"><Check size={30} strokeWidth={2.6} /></span>
          <p className="meta">Entrenamiento guardado · {formatLongDate(new Date(entry.completedAt))}</p>
          <h1 className="rise" style={{ "--i": 1 } as CSSProperties}>{entry.name ?? "Buen trabajo"}</h1>
          <p className="ses-summary-sub">Bien hecho. Cada serie registrada suma a tu progreso.</p>
        </header>

        <dl className="ses-summary-stats">
          <Figure index={0} label="Duración" value={duration} unit={durationUnit} />
          <Figure index={1} label="Volumen" value={volume} unit={volumeUnit} />
          <Figure index={2} label="Series" value={entry.sets} />
          <Figure index={3} label={prs.length === 1 ? "Récord" : "Récords"} value={prs.length} tone={prs.length ? "orange" : undefined} />
        </dl>

        <div className="ses-summary-lines">
          {kcal > 0 && (
            <p className="ses-summary-week">
              <Activity size={18} aria-hidden="true" />
              <span>≈ <b className="num">{formatKcal(kcal)}</b> kcal gastadas · según tu peso, duración y esfuerzo</span>
            </p>
          )}
          {week && (
            <p className={cn("ses-summary-week", week.streak > 0 && "is-streak")}>
              <Flame size={18} aria-hidden="true" />
              <span>
                <b className="num">{week.currentCount}</b> de <b className="num">{settings.weeklyGoal}</b> sesiones esta semana
                {week.streak > 0 && <> · racha de <b className="num">{week.streak}</b> {week.streak === 1 ? "semana" : "semanas"}</>}
              </span>
            </p>
          )}
        </div>

        {prs.length > 0 && (
          <section className="ses-summary-block" aria-labelledby="ses-prs-title">
            <h2 id="ses-prs-title" className="meta">Récords personales</h2>
            <ul className="ses-pr-list">
              {prs.map((hit) => (
                <li key={`${hit.exerciseId}-${hit.kind}`}>
                  <span className="ses-pr-icon" aria-hidden="true"><Trophy size={17} /></span>
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
          <section className="ses-summary-block" aria-labelledby="ses-muscles-title">
            <h2 id="ses-muscles-title" className="meta">Músculos trabajados</h2>
            <MuscleMap mode="heat" values={heat} className="ses-summary-map" label="Músculos trabajados hoy" />
          </section>
        )}

        <div className="ses-summary-actions">
          <Link href="/" className="btn btn-primary btn-large btn-block">Volver a Hoy</Link>
          <Link href="/progreso" className="btn btn-glass btn-block">Ver mi progreso</Link>
          <button type="button" className="btn btn-ghost btn-block" onClick={copySummary} aria-live="polite">
            {copied ? <><Check size={17} /> Resumen copiado</> : <><ClipboardCopy size={17} /> Copiar resumen</>}
          </button>
        </div>
      </div>
    </div>
  );
}
