"use client";

import { Flame } from "lucide-react";
import { Switch } from "@/components/ui";
import { SettingRow, SettingsGroup } from "./settings-group";

export function StreakSection({ ready, streak, currentCount, weeklyGoal, paused, onTogglePause }: { ready: boolean; streak: number; currentCount: number; weeklyGoal: number; paused: boolean; onTogglePause: (paused: boolean) => void }) {
  const remaining = Math.max(0, weeklyGoal - currentCount);
  return (
    <SettingsGroup index="01" title="Racha" description="Cuenta semanas, no días: descansar también es parte del plan." id="prof-streak">
      <div className="prof-row prof-streak">
        <span className="prof-streak-mark" aria-hidden="true"><Flame size={22} /></span>
        <div className="prof-streak-copy">
          <p>
            <b className="num">{ready ? streak : "—"}</b>
            <span>{streak === 1 ? "semana seguida" : "semanas seguidas"}</span>
          </p>
          <small>
            {!ready
              ? "Calculando tu semana…"
              : paused
                ? "Esta semana está en pausa: tu racha queda intacta."
                : remaining === 0
                  ? "Ya cumpliste tu objetivo de esta semana."
                  : `Te ${remaining === 1 ? "falta 1 sesión" : `faltan ${remaining} sesiones`} esta semana (${currentCount} de ${weeklyGoal}).`}
          </small>
        </div>
      </div>
      <SettingRow
        title="Pausar racha esta semana"
        helper="Para vacaciones, enfermedad o viaje. La semana no suma ni corta tu racha."
        control={<Switch checked={paused} onChange={onTogglePause} label="Pausar racha esta semana" />}
      />
    </SettingsGroup>
  );
}
