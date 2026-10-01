"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MuscleMap, RecoveryLegend } from "@/components/ui/muscle-map";
import { muscleRecovery } from "@/lib/analytics";
import { useWorkouts } from "@/lib/store";
import type { MuscleGroup } from "@/types";

const groups: Array<{ label: string; muscles: MuscleGroup[]; ready: string; recovering: string }> = [
  { label: "Piernas", muscles: ["quads", "hamstrings", "glutes", "calves"], ready: "listas", recovering: "recuperándose" },
  { label: "Pecho", muscles: ["chest"], ready: "listo", recovering: "recuperándose" },
  { label: "Espalda", muscles: ["back", "lats"], ready: "lista", recovering: "recuperándose" },
  { label: "Hombros", muscles: ["shoulders"], ready: "listos", recovering: "recuperándose" },
  { label: "Brazos", muscles: ["biceps", "triceps"], ready: "listos", recovering: "recuperándose" },
  { label: "Core", muscles: ["abs", "obliques"], ready: "listo", recovering: "recuperándose" },
];

function summary(recovery: Record<MuscleGroup, number>) {
  const scored = groups.map((group) => ({
    ...group,
    value: group.muscles.reduce((sum, muscle) => sum + recovery[muscle], 0) / group.muscles.length,
  }));
  const tired = scored.filter((group) => group.value < 85).sort((a, b) => a.value - b.value);
  if (!tired.length) return "Todo recuperado: buen día para entrenar lo que quieras.";
  const ready = scored.filter((group) => group.value >= 85);
  const parts = [
    ...ready.slice(0, 2).map((group) => `${group.label} ${group.ready}`),
    ...tired.slice(0, 2).map((group) => `${group.label} ${group.recovering}`),
  ];
  return parts.join(" · ");
}

export function RecoveryCard({ now }: { now: number }) {
  const [workouts] = useWorkouts();
  const recovery = muscleRecovery(workouts, now);
  return (
    <section className="card home-recovery" aria-labelledby="home-recovery-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">Recuperación muscular</p>
          <h2 id="home-recovery-title">Cómo está tu cuerpo</h2>
        </div>
        <Link href="/progreso" className="link-button">
          Progreso
          <ArrowRight size={14} />
        </Link>
      </div>
      <p className="home-recovery-summary">
        {workouts.length ? summary(recovery) : "Aún no hay registros: todos tus músculos están frescos para empezar."}
      </p>
      <div className="home-recovery-map">
        <MuscleMap mode="recovery" values={recovery} label="Mapa de recuperación muscular" />
      </div>
      <RecoveryLegend />
    </section>
  );
}
