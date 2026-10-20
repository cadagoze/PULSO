"use client";

import { useMemo } from "react";
import Link from "@/components/ui/app-link";
import { ChevronRight } from "lucide-react";
import { progressHighlight } from "@/lib/highlight";
import { useSettings, useWorkouts } from "@/lib/store";
import { cn, toDisplayWeight } from "@/lib/utils";

/** Un solo dato de progreso, el que vale la pena hoy (récord, más carga, constancia…). Si nada destaca, no aparece. */
export function ProgressNote({ now }: { now: number }) {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const highlight = useMemo(
    () => (now ? progressHighlight(workouts, { now: new Date(now), goal: settings.weeklyGoal, pausedWeeks: settings.pausedWeeks, unit: settings.unit, toDisplay: (kg) => toDisplayWeight(kg, settings.unit) }) : null),
    [now, settings.pausedWeeks, settings.unit, settings.weeklyGoal, workouts],
  );
  if (!highlight) return null;
  // Dorado sólo para récords y rachas.
  const gold = highlight.kind === "record" || highlight.kind === "streak";
  return (
    <section className="home-progress-note" aria-labelledby="home-progress-title">
      <h2 id="home-progress-title" className="meta">Tu progreso</h2>
      <Link href="/progreso" className="home-progress-link">
        <span className={cn("home-progress-value", gold && "is-gold")}>{highlight.value}</span>
        <span className="home-progress-label">{highlight.label}</span>
        <ChevronRight size={16} className="subtle" aria-hidden="true" />
      </Link>
    </section>
  );
}
