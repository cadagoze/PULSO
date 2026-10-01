"use client";

import { useNow } from "@/lib/use-now";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, Segmented } from "@/components/ui";
import { weekNumber } from "@/lib/utils";
import { TodayBuilder } from "@/components/train/today-builder";
import { RoutinesTab } from "@/components/train/routines-tab";
import { ProgramsTab } from "@/components/train/programs-tab";
import { ToolsTab } from "@/components/train/tools-tab";

type TrainTab = "hoy" | "rutinas" | "programas" | "herramientas";

const tabs: Array<{ value: TrainTab; label: string }> = [
  { value: "hoy", label: "Para hoy" },
  { value: "rutinas", label: "Rutinas" },
  { value: "programas", label: "Programas" },
  { value: "herramientas", label: "Herramientas" },
];

const subtitles: Record<TrainTab, string> = {
  hoy: "Una sesión armada para hoy según tu equipo, tu tiempo y tu recuperación.",
  rutinas: "Tus entrenamientos guardados, listos para repetir.",
  programas: "Planes de varias semanas con progresión incluida.",
  herramientas: "Calculadoras y temporizador para entrenar con precisión.",
};

function isTab(value: string | null): value is TrainTab {
  return tabs.some((tab) => tab.value === value);
}

export function TrainHub() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("tab");
  const tab: TrainTab = isTab(raw) ? raw : "hoy";
  const now = useNow();

  function select(next: TrainTab) {
    router.replace(next === "hoy" ? "/entrenar" : `/entrenar?tab=${next}`, { scroll: false });
  }

  return (
    <div className="page train-page">
      <PageHeader
        eyebrow={now ? `SEMANA ${weekNumber(new Date(now))}` : "SEMANA"}
        title="Entrenar"
        subtitle={subtitles[tab]}
      />
      <div className="train-tabs">
        <Segmented options={tabs} value={tab} onChange={select} label="Secciones de entrenamiento" />
      </div>
      <div role="tabpanel" aria-label={tabs.find((item) => item.value === tab)?.label} className="train-panel">
        {tab === "hoy" && <TodayBuilder />}
        {tab === "rutinas" && <RoutinesTab />}
        {tab === "programas" && <ProgramsTab />}
        {tab === "herramientas" && <ToolsTab />}
      </div>
    </div>
  );
}
