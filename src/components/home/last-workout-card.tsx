"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Trophy } from "lucide-react";
import { formatVolume } from "@/lib/analytics";
import { useWorkouts } from "@/lib/store";
import { recordsVolume, sortedWorkouts } from "@/lib/training";
import { formatRelativeDay } from "@/lib/utils";

export function LastWorkoutCard({ now }: { now: number }) {
  const [workouts] = useWorkouts();
  const last = sortedWorkouts(workouts)[0];

  if (!last) {
    return (
      <section className="card card-flat home-last home-last-empty" aria-labelledby="home-last-title">
        <span className="icon-tile"><Sparkles size={20} /></span>
        <div>
          <p className="eyebrow">Último entrenamiento</p>
          <h2 id="home-last-title">Tu primera sesión te espera</h2>
          <p className="muted">Cuando termines un entrenamiento verás aquí tu tiempo, series, volumen y récords.</p>
        </div>
      </section>
    );
  }

  const volume = last.volume ?? (last.records ? recordsVolume(last.records) : 0);
  const prs = last.prs?.length ?? 0;
  return (
    <Link href="/progreso" className="card card-link home-last" aria-labelledby="home-last-title">
      <div className="spread">
        <p className="eyebrow">Último entrenamiento · {formatRelativeDay(last.date, new Date(now))}</p>
        {prs > 0 && (
          <span className="badge badge-violet">
            <Trophy size={12} />
            {prs} {prs === 1 ? "récord" : "récords"}
          </span>
        )}
      </div>
      <h2 id="home-last-title">{last.name ?? "Entrenamiento"}</h2>
      <dl className="home-last-stats">
        <div>
          <dt>Duración</dt>
          <dd className="num">{Math.round(last.durationMinutes)} min</dd>
        </div>
        <div>
          <dt>Series</dt>
          <dd className="num">{last.sets}</dd>
        </div>
        <div>
          <dt>Volumen</dt>
          <dd className="num">{volume > 0 ? formatVolume(volume) : "—"}</dd>
        </div>
      </dl>
      <span className="link-button">
        Ver historial
        <ArrowRight size={14} />
      </span>
    </Link>
  );
}
