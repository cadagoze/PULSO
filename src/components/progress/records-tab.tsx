"use client";

import Link from "@/components/ui/app-link";
import { ChevronRight, Medal } from "lucide-react";
import { EmptyState, NumberMetric } from "@/components/ui";
import { exerciseName, weightLabel, type Unit } from "@/components/progress/format";
import { RecordRow } from "@/components/progress/record-row";
import { exerciseBests, type ExerciseBests } from "@/lib/progression";
import { useSettings, useWorkouts } from "@/lib/store";
import { exerciseById, sortedWorkouts } from "@/lib/training";
import { formatShortDate } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

interface ExerciseSummary {
  id: number;
  bests: ExerciseBests;
  lastDate: string;
  bestDate: string;
}

/** Fecha en que se alcanzó por primera vez la mejor marca principal del ejercicio. */
function bestDateFor(bests: ExerciseBests) {
  const score = (point: ExerciseBests["sessions"][number]) => point.e1rm || point.topLoad * 1000 + point.topValue;
  let best = bests.sessions[0];
  for (const point of bests.sessions) if (score(point) > score(best)) best = point;
  return best?.date ?? "";
}

function summaries(workouts: WorkoutEntry[]): ExerciseSummary[] {
  const ids = [...new Set(workouts.flatMap((workout) => (workout.records ?? []).map((record) => record.exerciseId)))];
  return ids
    .map((id) => {
      const bests = exerciseBests(workouts, id);
      return { id, bests, lastDate: bests.sessions.at(-1)?.date ?? "", bestDate: bestDateFor(bests) };
    })
    .filter((item) => item.bests.sessions.length > 0)
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || exerciseName(a.id).localeCompare(exerciseName(b.id), "es"));
}

/** Récords recientes (en naranja: es su color) y la mejor marca de cada ejercicio, con enlace a su progreso. */
export function RecordsTab() {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const list = summaries(workouts);
  const hits = sortedWorkouts(workouts).flatMap((workout) => (workout.prs ?? []).map((pr) => ({ pr, date: workout.date, key: `${workout.id}-${pr.exerciseId}-${pr.kind}` })));
  const feed = hits.slice(0, 8);

  if (!list.length) {
    return (
      <EmptyState
        icon={<Medal size={20} />}
        title="Tus récords aparecerán aquí"
        action={<Link href="/entrenar" className="btn btn-primary">Preparar entrenamiento</Link>}
      >
        Registra tus series y PULSO detectará cada nueva marca: más carga, más repeticiones o un mejor 1RM estimado.
      </EmptyState>
    );
  }

  return (
    <div className="prog-stack prog-records">
      <div className="prog-records-numbers">
        <NumberMetric size="l" value={String(hits.length).padStart(2, "0")} label={hits.length === 1 ? "récord personal" : "récords personales"} />
        <NumberMetric size="l" value={String(list.length).padStart(2, "0")} label={list.length === 1 ? "ejercicio con marca" : "ejercicios con marca"} />
      </div>

      <section className="section" aria-labelledby="prog-feed-title">
        <h2 id="prog-feed-title" className="meta">Récords recientes</h2>
        {feed.length ? (
          <ul className="list prog-list">
            {feed.map((item) => (
              <li key={item.key}><RecordRow pr={item.pr} date={item.date} unit={settings.unit} badge={false} /></li>
            ))}
          </ul>
        ) : (
          <p className="notice">Todavía no superas una marca. Repite tus ejercicios y aquí aparecerá cada mejora.</p>
        )}
      </section>

      <section className="section" aria-labelledby="prog-bests-title">
        <div className="section-head">
          <h2 id="prog-bests-title">Mejores marcas por ejercicio</h2>
          <span className="subtle num">{list.length}</span>
        </div>
        <ul className="prog-bests">
          {list.map((item) => (
            <li key={item.id}>
              <BestCard item={item} unit={settings.unit} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BestCard({ item, unit }: { item: ExerciseSummary; unit: Unit }) {
  const seconds = exerciseById(item.id)?.unit === "seconds";
  const { bests } = item;
  const sessions = bests.sessions.length;
  return (
    <Link href={`/ejercicios/${item.id}`} className="card card-link prog-best">
      <span className="prog-best-head">
        <strong>{exerciseName(item.id)}</strong>
        <ChevronRight size={18} aria-hidden="true" className="subtle" />
      </span>
      <span className="prog-best-stats">
        {seconds ? (
          <BestStat label="Mayor tiempo" value={`${bests.seconds.toLocaleString("es-CL")} s`} />
        ) : (
          <>
            <BestStat label="1RM estimado" value={bests.e1rm > 0 ? weightLabel(bests.e1rm, unit) : "—"} />
            <BestStat label="Mayor carga" value={bests.load > 0 ? weightLabel(bests.load, unit) : "Corporal"} />
            <BestStat label="Más reps" value={bests.reps.toLocaleString("es-CL")} />
          </>
        )}
      </span>
      <span className="prog-best-foot subtle">
        Mejor marca el {formatShortDate(item.bestDate)} · {sessions} {sessions === 1 ? "sesión" : "sesiones"} · última {formatShortDate(item.lastDate)}
      </span>
    </Link>
  );
}

function BestStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="prog-best-stat">
      <small className="meta">{label}</small>
      <b className="num">{value}</b>
    </span>
  );
}
