"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { Award, ChevronRight, Download, Gauge, History, Ruler, Trophy } from "lucide-react";
import { Sheet } from "@/components/ui";
import { ExportSheet } from "@/components/progress/export-sheet";
import { weightLabel } from "@/components/progress/format";
import { LoadDetails, loadStatusCopy, ratioLabel } from "@/components/progress/load-card";
import { markFromSummary, subviewHref, type ProgressSubview } from "@/components/progress/progress-nav";
import { achievements, trainingLoad } from "@/lib/analytics";
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

/** Índice del resto de Progreso: vistas completas (historial, récords, cuerpo, logros) y hojas (carga, exportar). */
export function MoreList({ workouts, nowMs }: { workouts: WorkoutEntry[]; nowMs: number }) {
  const [settings] = useSettings();
  const [weights] = useWeights();
  const [sheet, setSheet] = useState<"load" | "export" | null>(null);
  const last = sortedWorkouts(workouts)[0];
  const exercises = new Set(workouts.flatMap((workout) => (workout.records ?? []).map((record) => record.exerciseId))).size;
  const prs = workouts.reduce((sum, workout) => sum + (workout.prs?.length ?? 0), 0);
  const list = achievements(workouts, settings.weeklyGoal, settings.pausedWeeks);
  const unlocked = list.filter((item) => item.unlocked).length;
  const load = trainingLoad(workouts, nowMs);
  const lastWeight = [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);

  return (
    <section className="section prog-more" aria-labelledby="prog-more-title">
      <h2 id="prog-more-title" className="meta">Más de tu progreso</h2>
      <ul className="list prog-list">
        <ViewRow
          view="historial"
          icon={<History size={18} />}
          title="Historial"
          detail={last ? `${workouts.length} ${workouts.length === 1 ? "entrenamiento" : "entrenamientos"} · último ${formatRelativeDay(last.date, new Date(nowMs)).toLowerCase()}` : "Aún sin entrenamientos"}
        />
        <ViewRow view="records" icon={<Trophy size={18} />} title="Récords" detail={exercises ? `${exercises} ${exercises === 1 ? "ejercicio" : "ejercicios"} · ${prs} ${prs === 1 ? "récord" : "récords"}` : "Tus mejores marcas por ejercicio"} />
        <ViewRow view="cuerpo" icon={<Ruler size={18} />} title="Cuerpo" detail={lastWeight ? `${weightLabel(lastWeight.weight, settings.unit)} · peso y medidas` : "Peso y medidas"} />
        <ViewRow view="logros" icon={<Award size={18} />} title="Logros" detail={`${unlocked} de ${list.length} desbloqueados`} />
        <li>
          <button type="button" className="list-row" onClick={() => setSheet("load")}>
            <RowContent icon={<Gauge size={18} />} title="Carga de entrenamiento" detail={load.ratio === null ? loadStatusCopy.unknown.short : `${loadStatusCopy[load.status].short} · ${ratioLabel(load.ratio)}`} />
          </button>
        </li>
        <li>
          <button type="button" className="list-row" onClick={() => setSheet("export")}>
            <RowContent icon={<Download size={18} />} title="Exportar datos" detail="CSV o respaldo completo" />
          </button>
        </li>
      </ul>
      <Sheet open={sheet === "load"} onClose={() => setSheet(null)} eyebrow="Orientativo" title="Carga de entrenamiento">
        <LoadDetails workouts={workouts} now={nowMs} />
      </Sheet>
      <ExportSheet open={sheet === "export"} onClose={() => setSheet(null)} workouts={workouts} />
    </section>
  );
}
