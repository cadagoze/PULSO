"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AchievementsTab } from "@/components/progress/achievements-tab";
import { BodyTab } from "@/components/progress/body-tab";
import { ChallengesTab } from "@/components/progress/challenges-tab";
import { HistoryTab } from "@/components/progress/history-tab";
import { isPeriod, type Period } from "@/components/progress/period";
import type { ChartMetric } from "@/components/progress/period-chart";
import { isSubview, progressViews, useBackToSummary, type ProgressSubview } from "@/components/progress/progress-nav";
import { RecordsTab } from "@/components/progress/records-tab";
import { SummaryTab } from "@/components/progress/summary-tab";

const subtitles: Record<ProgressSubview, string> = {
  historial: "Cada sesión con sus series, cargas y récords.",
  records: "Tus mejores marcas, ejercicio por ejercicio.",
  cuerpo: "Peso y medidas: cambios que se ven con el tiempo.",
  logros: "Hitos de constancia, fuerza y volumen.",
  retos: "30 días, una meta. Se cuenta sola con lo que registras.",
};

/**
 * Progreso: por defecto, el resumen del periodo (Semana | Mes | Año, en `?periodo=`).
 * Las vistas completas se abren con `?tab=historial|records|cuerpo|logros`, como antes.
 */
export function ProgressView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = params.get("tab");
  const initial = params.get("periodo");
  // El periodo responde al instante; la URL se actualiza después para conservarlo al volver.
  const [period, setPeriod] = useState<Period>(isPeriod(initial) ? initial : "semana");
  const [metric, setMetric] = useState<ChartMetric | null>(null);

  function changePeriod(next: Period) {
    setPeriod(next);
    router.replace(next === "semana" ? pathname : `${pathname}?periodo=${next}`, { scroll: false });
  }

  if (isSubview(tab)) return <Subview key={tab} view={tab} />;
  return <SummaryTab period={period} onPeriod={changePeriod} metric={metric} onMetric={setMetric} />;
}

function Subview({ view }: { view: ProgressSubview }) {
  const back = useBackToSummary();
  const title = progressViews.find((item) => item.value === view)?.label ?? "Progreso";
  return (
    <div className="page prog-page prog-subview">
      <header className="page-header">
        <div>
          <button type="button" className="icon-button back" onClick={back} aria-label="Volver a Progreso">
            <ArrowLeft size={20} />
          </button>
          <p className="meta">Progreso</p>
          <h1>{title}</h1>
          <p className="page-subtitle">{subtitles[view]}</p>
        </div>
      </header>
      <div role="region" aria-label={title} className="prog-panel rise">
        {view === "historial" && <HistoryTab />}
        {view === "records" && <RecordsTab />}
        {view === "cuerpo" && <BodyTab />}
        {view === "logros" && <AchievementsTab />}
        {view === "retos" && <ChallengesTab />}
      </div>
    </div>
  );
}
