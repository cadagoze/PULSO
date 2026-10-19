"use client";

import Link from "@/components/ui/app-link";
import { useEffect, useState } from "react";
import { BookOpen, CalendarRange, ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { exercises } from "@/data/exercises";
import { programById } from "@/lib/programs";
import { useProgram, useRoutines } from "@/lib/store";
import { cn } from "@/lib/utils";
import { RoutinesSection, type Routine } from "@/components/train/routines-section";
import { SuggestedRoutines } from "@/components/train/suggested-routines";

/**
 * Lo que no es el entreno de hoy, en tres filas: rutinas (programas y las tuyas, que se despliegan
 * debajo), la biblioteca de ejercicios y Herramientas. `?tab=programas|rutinas` abre las rutinas.
 */
export function TrainMore({ initial, onCreate, onEdit, notify }: { initial: string | null; onCreate: () => void; onEdit: (routine: Routine) => void; notify: (message: string) => void }) {
  const [open, setOpen] = useState(initial === "programas" || initial === "rutinas");
  const [routines] = useRoutines();
  const [progress] = useProgram();
  const active = progress ? programById(progress.programId) : undefined;

  // Al llegar desde un enlace, se desplaza a las rutinas.
  useEffect(() => {
    if (initial !== "programas" && initial !== "rutinas") return;
    const frame = window.requestAnimationFrame(() => document.getElementById("train-panel")?.scrollIntoView({ block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [initial]);

  const routinesDetail = active ? `En curso: ${active.name}` : routines.length ? `Programas y ${routines.length} ${routines.length === 1 ? "rutina tuya" : "rutinas tuyas"}` : "Programas recomendados o crea la tuya";

  return (
    <div className="train-more">
      <ul className="list train-links">
        <li>
          <button type="button" className={cn("list-row", open && "is-open")} aria-expanded={open} aria-controls="train-panel" onClick={() => setOpen((value) => !value)}>
            <span className="icon-tile" aria-hidden="true"><CalendarRange size={19} /></span>
            <span className="grow"><strong>Rutinas</strong><small>{routinesDetail}</small></span>
            <ChevronDown size={18} className="subtle train-links-chevron" aria-hidden="true" />
          </button>
        </li>
        <li>
          <Link href="/ejercicios" className="list-row">
            <span className="icon-tile" aria-hidden="true"><BookOpen size={19} /></span>
            <span className="grow"><strong>Biblioteca de ejercicios</strong><small className="num">{exercises.length} ejercicios con su técnica</small></span>
            <ChevronRight size={18} className="subtle" aria-hidden="true" />
          </Link>
        </li>
        <li>
          <Link href="/herramientas" className="list-row">
            <span className="icon-tile" aria-hidden="true"><Wrench size={19} /></span>
            <span className="grow"><strong>Herramientas</strong><small>Intervalos, pausas, calculadoras, test y retos</small></span>
            <ChevronRight size={18} className="subtle" aria-hidden="true" />
          </Link>
        </li>
      </ul>

      {open && (
        <div id="train-panel" className="train-panel train-swap">
          <SuggestedRoutines onCreate={onCreate} />
          <RoutinesSection onCreate={onCreate} onEdit={onEdit} notify={notify} />
        </div>
      )}
    </div>
  );
}
