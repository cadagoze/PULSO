"use client";

import { challengeCatalog, challengeProgress, type ChallengeKind, type ChallengeProgress } from "@/lib/challenges";
import { confirmAction } from "@/lib/confirm";
import { waterGoal } from "@/lib/nutrition";
import { useChallenges, useFoodLog, useWater, useWorkouts } from "@/lib/store";
import { newId } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { useLatestWeight, useNutritionDay } from "@/lib/use-nutrition";
import { localDateKey } from "@/lib/utils";

export type BoardItem = ChallengeProgress & { id: string; start: string };

const MAX_ACTIVE = 3;

/** Retos con su avance calculado desde tus registros, y cómo empezar o abandonar uno. */
export function useChallengeBoard() {
  const now = useNow();
  const [entries, setEntries] = useChallenges();
  const [workouts] = useWorkouts();
  const [foodLog] = useFoodLog();
  const [water] = useWater();
  const weight = useLatestWeight();
  const { targets, counting } = useNutritionDay(now);
  const today = now ? localDateKey(new Date(now)) : "";
  const data = { workouts, foodLog, water, waterGoal: waterGoal(weight).glasses, proteinTarget: counting && targets ? targets.protein : null };
  const items = today
    ? entries.map((entry) => {
        const progress = challengeProgress(entry, data, today);
        return progress ? { ...progress, id: entry.id, start: entry.start } : null;
      }).filter((item): item is BoardItem => item !== null)
    : [];
  const active = items.filter((item) => item.status === "active").sort((a, b) => b.count / b.target - a.count / a.target);
  const medals = items.filter((item) => item.status === "done").sort((a, b) => (b.doneOn ?? "").localeCompare(a.doneOn ?? ""));
  const missed = items.filter((item) => item.status === "expired").sort((a, b) => b.end.localeCompare(a.end)).slice(0, 3);
  const activeKinds = new Set(active.map((item) => item.def.kind));
  const available = challengeCatalog.filter((def) => !activeKinds.has(def.kind) && (!def.counting || counting));

  function start(kind: ChallengeKind) {
    if (!today || active.length >= MAX_ACTIVE) return false;
    setEntries((current) => [...current, { id: newId("reto"), kind, start: today }]);
    return true;
  }

  async function abandon(item: BoardItem) {
    if (!(await confirmAction({ title: "¿Abandonar el reto?", message: `«${item.def.title}»: llevas ${item.count} de ${item.target}. Puedes empezarlo de nuevo cuando quieras.`, confirmLabel: "Abandonar", danger: true }))) return false;
    setEntries((current) => current.map((entry) => (entry.id === item.id ? { ...entry, endedAt: today } : entry)));
    return true;
  }

  return { ready: Boolean(today), today, active, medals, missed, available, canStart: active.length < MAX_ACTIVE, start, abandon };
}
