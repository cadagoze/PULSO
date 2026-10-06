"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, CalendarRange, ChevronDown, ListChecks, Wrench } from "lucide-react";
import { exercises } from "@/data/exercises";
import { programs } from "@/data/programs";
import { goalLabels } from "@/lib/nutrition";
import { useRoutines } from "@/lib/store";
import { cn } from "@/lib/utils";
import { GoalWeek, useGoalWeek, weekSummary } from "@/components/train/goal-week";
import { RoutinesSection, type Routine } from "@/components/train/routines-section";
import { SuggestedRoutines } from "@/components/train/suggested-routines";
import { ToolsRow } from "@/components/train/tools-row";

type Panel = "week" | "programs" | "routines" | "tools";

/** Enlaces antiguos (`?tab=`, `#objetivo`): abren el panel que corresponde. */
const linkPanels: Record<string, Panel> = { programas: "programs", rutinas: "routines", herramientas: "tools", objetivo: "week" };

/**
 * Todo lo que no es el entreno de hoy, plegado: el avance de la semana en una línea y accesos a
 * programas, tus rutinas, biblioteca y herramientas. Cada acceso despliega su contenido debajo.
 */
export function TrainMore({ now, initial, onCreate, onEdit, notify }: { now: number; initial: string | null; onCreate: () => void; onEdit: (routine: Routine) => void; notify: (message: string) => void }) {
  const [open, setOpen] = useState<Panel | null>(initial ? linkPanels[initial] ?? null : null);
  const [routines] = useRoutines();
  const goalWeek = useGoalWeek(now);

  // Al llegar desde un enlace, se desplaza al panel abierto.
  useEffect(() => {
    if (!initial || !linkPanels[initial]) return;
    const frame = window.requestAnimationFrame(() => document.getElementById("train-panel")?.scrollIntoView({ block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [initial]);

  const toggle = (panel: Panel) => setOpen((current) => (current === panel ? null : panel));

  return (
    <div className="train-more">
      <button type="button" id="objetivo" className={cn("train-week-row pressable", open === "week" && "is-open")} aria-expanded={open === "week"} aria-controls="train-panel" onClick={() => toggle("week")}>
        <span className="grow">
          <span className="meta">Tu semana · {goalLabels[goalWeek.goal]}</span>
          <strong className="num">{weekSummary(goalWeek)}</strong>
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>

      <div className="train-tiles" role="group" aria-label="Más opciones de entrenamiento">
        <Tile icon={<CalendarRange size={18} />} label="Programas" detail={`${programs.length} planes`} open={open === "programs"} onClick={() => toggle("programs")} />
        <Tile icon={<ListChecks size={18} />} label="Mis rutinas" detail={routines.length ? `${routines.length} ${routines.length === 1 ? "guardada" : "guardadas"}` : "Crea la tuya"} open={open === "routines"} onClick={() => toggle("routines")} />
        <Link href="/ejercicios" className="train-tile pressable">
          <span className="train-tile-icon" aria-hidden="true"><BookOpen size={18} /></span>
          <strong>Biblioteca</strong>
          <small className="num">{exercises.length} ejercicios</small>
        </Link>
        <Tile icon={<Wrench size={18} />} label="Herramientas" detail="1RM, discos, intervalos" open={open === "tools"} onClick={() => toggle("tools")} />
      </div>

      {open && (
        <div id="train-panel" key={open} className="train-panel train-swap">
          {open === "week" && <GoalWeek now={now} bare />}
          {open === "programs" && <SuggestedRoutines onCreate={onCreate} />}
          {open === "routines" && <RoutinesSection onCreate={onCreate} onEdit={onEdit} notify={notify} />}
          {open === "tools" && <ToolsRow />}
        </div>
      )}
    </div>
  );
}

function Tile({ icon, label, detail, open, onClick }: { icon: ReactNode; label: string; detail: string; open: boolean; onClick: () => void }) {
  return (
    <button type="button" className={cn("train-tile pressable", open && "is-open")} aria-expanded={open} aria-controls="train-panel" onClick={onClick}>
      <span className="train-tile-icon" aria-hidden="true">{icon}</span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </button>
  );
}
