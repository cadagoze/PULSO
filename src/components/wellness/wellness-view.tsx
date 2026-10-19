"use client";

import { useMemo } from "react";
import { Moon } from "lucide-react";
import { BodyCheck } from "@/components/home/body-check";
import { PageHeader, Stepper } from "@/components/ui";
import { muscleRecovery, trainingLoad } from "@/lib/analytics";
import { quickReadiness, readinessFeel } from "@/lib/readiness";
import { recoveryLines, recoverySummary } from "@/lib/recovery";
import { useReadiness, useWellness, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { cn, formatNumber, localDateKey } from "@/lib/utils";
import { SLEEP_RANGE, upsertWellness, weekWellness } from "@/lib/wellness";

const HOUR = 3_600_000;

const loadCopy: Record<ReturnType<typeof trainingLoad>["status"], string | null> = {
  low: "Tu carga de los últimos 7 días está por debajo de lo habitual.",
  optimal: "Tu carga de entrenamiento está en un rango equilibrado.",
  high: "Esta semana acumulas más carga de lo habitual: dosifica y duerme bien.",
  unknown: null,
};

/**
 * Bienestar, al servicio del entrenamiento: energía y molestias (el mismo chequeo de Inicio, que ajusta
 * la sesión de hoy), el sueño y cómo se recupera cada grupo muscular. Sin paneles de números.
 */
export function WellnessView() {
  const now = useNow();
  const [entries, setEntries] = useWellness();
  const [readiness, setReadiness] = useReadiness();
  const [workouts] = useWorkouts();
  const today = now ? localDateKey(new Date(now)) : "";
  const hourNow = Math.floor(now / HOUR) * HOUR;
  const recovery = useMemo(() => (hourNow ? muscleRecovery(workouts, hourNow) : null), [hourNow, workouts]);

  if (!now || !recovery) return <div className="page well-page" aria-busy="true"><div className="well-skeleton" /></div>;

  const entry = entries.find((item) => item.date === today);
  const week = weekWellness(entries, today);
  const load = trainingLoad(workouts, now);
  const lines = recoveryLines(recovery);

  function saveSleep(hours: number) {
    setEntries((current) => upsertWellness(current, localDateKey(), { sleepHours: hours }));
    // El chequeo de hoy recoge el sueño anotado; su recomendación sigue dependiendo de cómo llegas.
    if (readiness.some((item) => item.date === today && item.feel)) {
      const loadRatio = trainingLoad(workouts, now).ratio;
      setReadiness((items) => items.map((item) => (item.date === today ? quickReadiness({ date: today, feel: readinessFeel(item), pain: item.pain, sleepHours: hours, loadRatio }) : item)));
    }
  }

  return (
    <div className="page well-page">
      <PageHeader backHref="/perfil" meta="Lo que sostiene tu entrenamiento" title="Bienestar" subtitle="Tu energía, tus molestias y tu sueño ajustan la sesión de hoy. Recuperarse también es entrenar." />

      <BodyCheck today={today} title="Energía y molestias" />

      <section className="section" aria-labelledby="well-sleep-title">
        <h2 id="well-sleep-title" className="meta">Sueño</h2>
        <div className="well-card">
          <div className="well-row">
            <span className="icon-tile" aria-hidden="true"><Moon size={18} /></span>
            <span className="grow">
              <strong>Anoche</strong>
              <small>{entry?.sleepHours === undefined ? `Lo ideal: ${SLEEP_RANGE.min} a ${SLEEP_RANGE.max} horas` : sleepNote(entry.sleepHours)}</small>
            </span>
            <Stepper label="Horas de sueño" value={entry?.sleepHours ?? 0} min={0} max={14} step={0.5} format={(hours) => (entry?.sleepHours === undefined ? "—" : `${formatNumber(hours)} h`)} onChange={(hours) => saveSleep(entry?.sleepHours === undefined && hours < 1 ? 7 : hours)} />
          </div>
          {week.sleep !== null && week.days > 1 && (
            <p className="well-note">Promedio de los últimos 7 días: <b className="num">{formatNumber(week.sleep)} h</b>.</p>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="well-recovery-title">
        <h2 id="well-recovery-title" className="meta">Recuperación</h2>
        <div className="well-card">
          <ul className="well-recovery-list">
            {lines.map((line) => (
              <li key={line.label} className={cn(line.ready && "is-ready")}>
                <span className="well-recovery-dot" aria-hidden="true" />
                <strong>{line.label}</strong> {line.state}
              </li>
            ))}
          </ul>
          <p className="well-note">{recoverySummary(recovery, workouts.length > 0)}{loadCopy[load.status] ? ` ${loadCopy[load.status]}` : ""}</p>
        </div>
      </section>
    </div>
  );
}

function sleepNote(hours: number) {
  if (hours < 6) return "Poco sueño: si llegas con cansancio, márcalo arriba y la sesión se acorta.";
  if (hours < SLEEP_RANGE.min) return "Un poco menos de lo ideal.";
  if (hours > SLEEP_RANGE.max) return "Dormiste bastante.";
  return "En el rango ideal.";
}
