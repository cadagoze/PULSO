"use client";

import Link from "@/components/ui/app-link";
import { useState, type FormEvent } from "react";
import { Annoyed, ChevronRight, Footprints, Frown, Laugh, Meh, Moon, Smile, type LucideIcon } from "lucide-react";
import { HabitRows } from "@/components/content/habit-rows";
import { readinessState } from "@/components/home/readiness-card";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { MetricGrid, NumberMetric, PageHeader, ProgressRing, Stepper } from "@/components/ui";
import { useHabits, useReadiness, useWellness } from "@/lib/store";
import { useWaterToday } from "@/lib/use-nutrition";
import { useNow } from "@/lib/use-now";
import { cn, formatNumber, localDateKey } from "@/lib/utils";
import { SLEEP_RANGE, STEPS_REFERENCE, moodLabels, upsertWellness, weekWellness, type Mood } from "@/lib/wellness";

const moods: Array<{ value: Mood; icon: LucideIcon }> = [
  { value: 1, icon: Frown },
  { value: 2, icon: Annoyed },
  { value: 3, icon: Meh },
  { value: 4, icon: Smile },
  { value: 5, icon: Laugh },
];

/**
 * Bienestar, secundario al entrenamiento: sueño, pasos, ánimo y agua de hoy en una sola tarjeta,
 * la recuperación (del chequeo de Inicio), los hábitos y los promedios de la semana.
 */
export function WellnessView() {
  const now = useNow();
  const [entries, setEntries] = useWellness();
  const [readiness] = useReadiness();
  const [checked, setChecked] = useHabits();
  const water = useWaterToday(now);
  const today = now ? localDateKey(new Date(now)) : "";
  const entry = entries.find((item) => item.date === today);
  const week = today ? weekWellness(entries, today) : null;
  const check = readiness.find((item) => item.date === today);

  if (!now) return <div className="page well-page" aria-busy="true"><div className="well-skeleton" /></div>;

  function save(patch: Parameters<typeof upsertWellness>[2]) {
    setEntries((current) => upsertWellness(current, localDateKey(), patch));
  }

  return (
    <div className="page well-page">
      <PageHeader backHref="/perfil" meta="Lo que sostiene tu entrenamiento" title="Bienestar" subtitle="Sueño, pasos, ánimo y agua. Anótalos en segundos; tu entrenamiento sigue siendo lo principal." />

      <section className="section" aria-labelledby="well-today-title">
        <h2 id="well-today-title" className="meta">Hoy</h2>
        <div className="well-card">
          <div className="well-row">
            <span className="icon-tile" aria-hidden="true"><Moon size={18} /></span>
            <span className="grow">
              <strong>Sueño</strong>
              <small>{entry?.sleepHours === undefined ? `Lo ideal: ${SLEEP_RANGE.min} a ${SLEEP_RANGE.max} horas` : sleepNote(entry.sleepHours)}</small>
            </span>
            <Stepper label="Horas de sueño" value={entry?.sleepHours ?? 0} min={0} max={14} step={0.5} format={(hours) => (entry?.sleepHours === undefined ? "—" : `${formatNumber(hours)} h`)} onChange={(hours) => save({ sleepHours: entry?.sleepHours === undefined && hours < 1 ? 7 : hours })} />
          </div>
          <StepsRow key={entry?.steps ?? "none"} steps={entry?.steps} onSave={(steps) => save({ steps })} />
          <div className="well-row well-row-mood">
            <span className="grow">
              <strong>Ánimo</strong>
              <small>{entry?.mood ? moodLabels[entry.mood] : "¿Cómo te sientes hoy?"}</small>
            </span>
            <div className="well-moods" role="radiogroup" aria-label="Ánimo de hoy">
              {moods.map(({ value, icon: Icon }) => (
                <button key={value} type="button" role="radio" aria-checked={entry?.mood === value} aria-label={moodLabels[value]} className={cn("well-mood", entry?.mood === value && "is-on")} onClick={() => save({ mood: entry?.mood === value ? null : value })}>
                  <Icon size={22} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <WaterTracker className="well-water" glasses={water.glasses} goal={water.goal} onChange={water.change} />
        </div>
      </section>

      <section className="section" aria-labelledby="well-recovery-title">
        <h2 id="well-recovery-title" className="meta">Recuperación</h2>
        {check ? (
          <Link href="/progreso" className="well-card well-recovery">
            <ProgressRing value={check.score} size={56} stroke={8} color={readinessState(check.score).color} label={`Preparación ${check.score} de 100`}>
              <b className="num">{check.score}</b>
            </ProgressRing>
            <span className="grow">
              <strong>{readinessState(check.score).label}</strong>
              <small>Según tu chequeo de hoy. En Progreso ves cómo se recupera cada músculo.</small>
            </span>
            <ChevronRight size={18} className="subtle" aria-hidden="true" />
          </Link>
        ) : (
          <Link href="/" className="well-card well-recovery">
            <span className="grow">
              <strong>Haz tu chequeo de 20 segundos</strong>
              <small>En Inicio, antes de entrenar: energía, sueño, molestias y estrés.</small>
            </span>
            <ChevronRight size={18} className="subtle" aria-hidden="true" />
          </Link>
        )}
      </section>

      <section className="section" aria-labelledby="well-habits-title">
        <h2 id="well-habits-title" className="meta">Hábitos</h2>
        <HabitRows checked={checked} fresh={null} onToggle={(id) => setChecked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))} />
      </section>

      {week && week.days > 0 && (
        <section className="section well-week" aria-labelledby="well-week-title">
          <h2 id="well-week-title" className="meta">Últimos 7 días · {week.days} {week.days === 1 ? "día anotado" : "días anotados"}</h2>
          <MetricGrid>
            <NumberMetric size="s" value={week.sleep === null ? "—" : formatNumber(week.sleep)} unit={week.sleep === null ? undefined : "h"} label="sueño promedio" />
            <NumberMetric size="s" value={week.steps === null ? "—" : Math.round(week.steps).toLocaleString("es-CL")} label="pasos promedio" />
            <NumberMetric size="s" value={week.mood === null ? "—" : formatNumber(week.mood)} unit={week.mood === null ? undefined : "/ 5"} label="ánimo promedio" />
          </MetricGrid>
        </section>
      )}
    </div>
  );
}

function sleepNote(hours: number) {
  if (hours < SLEEP_RANGE.min) return "Menos de lo ideal: hoy, sesión más liviana si te sientes cansado.";
  if (hours > SLEEP_RANGE.max) return "Dormiste bastante.";
  return "En el rango ideal.";
}

/** Pasos del día, escritos a mano (desde el contador de tu teléfono o reloj). */
function StepsRow({ steps, onSave }: { steps?: number; onSave: (steps: number | null) => void }) {
  const [draft, setDraft] = useState(steps === undefined ? "" : String(steps));
  const changed = draft !== (steps === undefined ? "" : String(steps));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(draft.replace(/\D/g, ""));
    onSave(draft.trim() && Number.isFinite(value) ? Math.min(100_000, value) : null);
  }

  return (
    <form className="well-row" onSubmit={submit}>
      <span className="icon-tile" aria-hidden="true"><Footprints size={18} /></span>
      <span className="grow">
        <strong>Pasos</strong>
        <small>{steps === undefined ? "Cópialos de tu teléfono o reloj" : steps >= STEPS_REFERENCE ? "Sobre los 7.000: buen día de movimiento." : `Referencia: ${STEPS_REFERENCE.toLocaleString("es-CL")} al día`}</small>
      </span>
      <input className="well-steps num" inputMode="numeric" placeholder="0" value={draft} onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 6))} onBlur={(event) => event.currentTarget.form?.requestSubmit()} aria-label="Pasos de hoy" />
      {changed && <button type="submit" className="btn btn-secondary btn-small">Guardar</button>}
    </form>
  );
}
