"use client";

import Link from "@/components/ui/app-link";
import type { ReactNode } from "react";
import { Activity, Award, ChevronRight, History, Ruler, Trophy, Wrench } from "lucide-react";
import { weightLabel } from "@/components/progress/format";
import { markFromSummary, subviewHref, type ProgressSubview } from "@/components/progress/progress-nav";
import { achievements } from "@/lib/analytics";
import { useSettings, useWeights } from "@/lib/store";
import { sortedWorkouts } from "@/lib/training";
import { formatRelativeDay } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

function RowContent({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <>
      <span className="icon-tile" aria-hidden="true">{icon}</span>
      <span className="grow">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ChevronRight size={18} className="subtle" aria-hidden="true" />
    </>
  );
}

function ViewRow({ view, icon, title, detail }: { view: ProgressSubview; icon: ReactNode; title: string; detail: string }) {
  return (
    <li>
      <Link href={subviewHref(view)} className="list-row" onClick={markFromSummary}>
        <RowContent icon={icon} title={title} detail={detail} />
      </Link>
    </li>
  );
}

/** «Ver detalles»: historial, récords, cuerpo, músculos y logros; aparte, las herramientas para medirte (test y retos). */
export function MoreList({ workouts, nowMs }: { workouts: WorkoutEntry[]; nowMs: number }) {
  const [settings] = useSettings();
  const [weights] = useWeights();
  const last = sortedWorkouts(workouts)[0];
  const exercises = new Set(workouts.flatMap((workout) => (workout.records ?? []).map((record) => record.exerciseId))).size;
  const prs = workouts.reduce((sum, workout) => sum + (workout.prs?.length ?? 0), 0);
  const list = achievements(workouts, settings.weeklyGoal, settings.pausedWeeks);
  const unlocked = list.filter((item) => item.unlocked).length;
  const lastWeight = [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);

  return (
    <section className="section prog-more" aria-labelledby="prog-more-title">
      <h2 id="prog-more-title" className="meta">Ver detalles</h2>
      <ul className="list prog-list">
        <ViewRow
          view="historial"
          icon={<History size={18} />}
          title="Historial"
          detail={last ? `${workouts.length} ${workouts.length === 1 ? "entrenamiento" : "entrenamientos"} · último ${formatRelativeDay(last.date, new Date(nowMs)).toLowerCase()}` : "Aún sin entrenamientos"}
        />
        <ViewRow view="records" icon={<Trophy size={18} />} title="Récords" detail={exercises ? `${exercises} ${exercises === 1 ? "ejercicio" : "ejercicios"} · ${prs} ${prs === 1 ? "récord" : "récords"}` : "Tus mejores marcas por ejercicio"} />
        <ViewRow view="cuerpo" icon={<Ruler size={18} />} title="Cuerpo" detail={lastWeight ? `${weightLabel(lastWeight.weight, settings.unit)} · peso y medidas` : "Peso y medidas"} />
        <ViewRow view="musculos" icon={<Activity size={18} />} title="Músculos" detail="Series por grupo muscular esta semana" />
        <ViewRow view="logros" icon={<Award size={18} />} title="Logros" detail={`${unlocked} de ${list.length} desbloqueados`} />
      </ul>
      <Link href="/herramientas" className="list-row prog-tools-row">
        <RowContent icon={<Wrench size={18} />} title="Herramientas" detail="Test físico, retos de 30 días y calculadoras" />
      </Link>
    </section>
  );
}
