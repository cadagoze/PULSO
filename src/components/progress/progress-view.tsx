"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AchievementsTab } from "@/components/progress/achievements-tab";
import { BodyTab } from "@/components/progress/body-tab";
import { HistoryTab } from "@/components/progress/history-tab";
import { MusclesView } from "@/components/progress/muscles-section";
import { isSubview, progressViews, useBackToSummary, type ProgressSubview } from "@/components/progress/progress-nav";
import { RecordsTab } from "@/components/progress/records-tab";
import { SummaryTab } from "@/components/progress/summary-tab";

const subtitles: Record<ProgressSubview, string> = {
  historial: "Cada sesión con sus series, cargas y récords.",
  records: "Tus mejores marcas, ejercicio por ejercicio.",
  cuerpo: "Peso y medidas: cambios que se ven con el tiempo.",
  musculos: "Series por grupo muscular esta semana, frente a lo recomendado.",
  logros: "Hitos de constancia, fuerza y volumen.",
};

/** Retos y test físico viven ahora en Herramientas; los enlaces antiguos llevan ahí. */
const movedToTools = new Set(["retos", "test"]);

/**
 * Progreso: por defecto, el resumen (la semana y la tendencia de 12 semanas). Las vistas completas se
 * abren con `?tab=historial|records|cuerpo|musculos|logros`, como antes (`?periodo=` ya no aplica).
 */
export function ProgressView() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab");

  useEffect(() => {
    if (tab && movedToTools.has(tab)) router.replace(`/herramientas?tab=${tab}`);
  }, [router, tab]);

  if (isSubview(tab)) return <Subview key={tab} view={tab} />;
  return <SummaryTab />;
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
        {view === "musculos" && <MusclesView />}
        {view === "logros" && <AchievementsTab />}
      </div>
    </div>
  );
}
