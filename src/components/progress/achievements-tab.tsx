"use client";

import { Award, CalendarCheck, CalendarRange, Check, Crown, Dumbbell, Footprints, Layers, Medal, Repeat, Timer, Trophy, Zap, type LucideIcon } from "lucide-react";
import { NumberMetric, ProgressBar } from "@/components/ui";
import { achievements, type Achievement } from "@/lib/analytics";
import { useSettings, useWorkouts } from "@/lib/store";
import { cn } from "@/lib/utils";

const groups: Array<{ id: Achievement["group"]; label: string; detail: string }> = [
  { id: "constancia", label: "Constancia", detail: "Volver una y otra vez" },
  { id: "fuerza", label: "Fuerza", detail: "Superar tus propias marcas" },
  { id: "volumen", label: "Volumen", detail: "Todo el trabajo acumulado" },
];

const meta: Record<string, { icon: LucideIcon; target: number; unit?: string; scale?: number }> = {
  first: { icon: Footprints, target: 1 },
  ten: { icon: Repeat, target: 10 },
  fifty: { icon: Medal, target: 50 },
  hundred: { icon: Crown, target: 100 },
  "streak-4": { icon: CalendarCheck, target: 4, unit: "semanas" },
  "streak-12": { icon: CalendarRange, target: 12, unit: "semanas" },
  "pr-1": { icon: Zap, target: 1 },
  "pr-10": { icon: Trophy, target: 10 },
  "pr-50": { icon: Award, target: 50 },
  "sets-100": { icon: Layers, target: 100, unit: "series" },
  "volume-10t": { icon: Dumbbell, target: 10, unit: "t", scale: 1 },
  "minutes-600": { icon: Timer, target: 600, unit: "min" },
};

function progressText(item: Achievement) {
  const info = meta[item.id];
  const target = info?.target ?? 1;
  const decimals = info?.scale ?? 0;
  const value = item.progress * target;
  const current = value.toLocaleString("es-CL", { maximumFractionDigits: decimals });
  return `${current} de ${target.toLocaleString("es-CL")}${info?.unit ? ` ${info.unit}` : ""}`;
}

/** Logros: cuántos llevas en grande y cada hito con su avance. */
export function AchievementsTab() {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const list = achievements(workouts, settings.weeklyGoal, settings.pausedWeeks);
  const unlocked = list.filter((item) => item.unlocked).length;
  const next = list.filter((item) => !item.unlocked).sort((a, b) => b.progress - a.progress)[0];

  return (
    <div className="prog-stack prog-achievements">
      <section className="prog-ach-summary" aria-labelledby="prog-ach-title">
        <h2 id="prog-ach-title" className="meta">Logros desbloqueados</h2>
        <NumberMetric
          size="xl"
          value={<>{unlocked}<span className="nmetric-soft">/{list.length}</span></>}
          label={unlocked === list.length ? "Los tienes todos. Impresionante." : next ? `Siguiente: ${next.title} · ${progressText(next)}` : "Cada sesión te acerca al siguiente."}
        />
        <ProgressBar value={(unlocked / list.length) * 100} label={`${unlocked} de ${list.length} logros`} />
      </section>

      {groups.map((group) => (
        <section key={group.id} className="section" aria-labelledby={`prog-ach-${group.id}`}>
          <div className="section-head">
            <h2 id={`prog-ach-${group.id}`}>{group.label}</h2>
            <span className="subtle prog-ach-group-detail">{group.detail}</span>
          </div>
          <ul className="prog-badges">
            {list.filter((item) => item.group === group.id).map((item) => (
              <li key={item.id}>
                <Badge item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Badge({ item }: { item: Achievement }) {
  const Icon = meta[item.id]?.icon ?? Award;
  return (
    <article className={cn("prog-badge", item.unlocked ? "unlocked" : "locked")} aria-label={`${item.title}: ${item.unlocked ? "desbloqueado" : progressText(item)}`}>
      <span className="prog-badge-icon" aria-hidden="true">
        <Icon size={22} />
      </span>
      <span className="prog-badge-body">
        <strong>{item.title}</strong>
        <small>{item.detail}</small>
        {item.unlocked ? (
          <span className="prog-badge-done"><Check size={13} strokeWidth={3} aria-hidden="true" />Desbloqueado</span>
        ) : (
          <span className="prog-badge-progress">
            <ProgressBar value={item.progress * 100} label={`Progreso de ${item.title}`} />
            <span className="num">{progressText(item)}</span>
          </span>
        )}
      </span>
    </article>
  );
}
