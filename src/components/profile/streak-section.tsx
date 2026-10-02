"use client";

import { Flame } from "lucide-react";
import { Switch } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SettingRow, SettingsGroup } from "./settings-group";

function streakDetail(paused: boolean, remaining: number, currentCount: number, weeklyGoal: number) {
  if (paused) return "Esta semana está en pausa: tu racha queda intacta.";
  if (remaining === 0) return "Ya cumpliste tu objetivo de esta semana.";
  return `Te ${remaining === 1 ? "falta 1 sesión" : `faltan ${remaining} sesiones`} esta semana (${currentCount} de ${weeklyGoal}).`;
}

/** Racha semanal en grande y la pausa para vacaciones, enfermedad o viaje. */
export function StreakSection({ streak, currentCount, weeklyGoal, paused, onTogglePause, order }: { streak: number; currentCount: number; weeklyGoal: number; paused: boolean; onTogglePause: (paused: boolean) => void; order?: number }) {
  const remaining = Math.max(0, weeklyGoal - currentCount);
  return (
    <SettingsGroup id="racha" index="03" title="Racha" description="Cuenta semanas, no días: descansar también es parte del plan." order={order}>
      <div className={cn("prof-row prof-streak", streak > 0 && "active")}>
        <span className="prof-streak-num num-display">{streak}</span>
        <div className="prof-row-text">
          <strong>{streak === 1 ? "semana seguida" : "semanas seguidas"}</strong>
          <small>{streakDetail(paused, remaining, currentCount, weeklyGoal)}</small>
        </div>
        <Flame size={22} className="prof-streak-flame" aria-hidden="true" />
      </div>
      <SettingRow
        title="Pausar racha esta semana"
        helper="Para vacaciones, enfermedad o viaje. La semana no suma ni corta tu racha."
        control={<Switch checked={paused} onChange={onTogglePause} label="Pausar racha esta semana" />}
      />
    </SettingsGroup>
  );
}
