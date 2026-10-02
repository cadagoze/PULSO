"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Dumbbell, StretchHorizontal, Timer, Utensils } from "lucide-react";
import { generateWorkout, levelFromActivities } from "@/lib/generator";
import { useStartWorkout } from "@/lib/session";
import { usePreference, useProfile } from "@/lib/store";
import { dayOfYear, profileLimitations } from "./helpers";

function Label({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <>
      <span className="home-quick-icon" aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </>
  );
}

/** Atajos ligeros (sin tarjetas): entrenamiento libre, intervalos, movilidad y comidas. */
export function QuickActions() {
  const start = useStartWorkout();
  const [preference] = usePreference();
  const [profile] = useProfile();

  function startMobility() {
    const workout = generateWorkout({
      preference,
      minutes: 10,
      focus: "mobility",
      level: levelFromActivities(profile?.activities),
      limitations: profileLimitations(profile?.limitations),
      seed: dayOfYear(Date.now()),
    });
    start({ name: "Movilidad 10 min", records: workout.records, restSeconds: workout.restSeconds, source: { type: "generated" } });
  }

  return (
    <section className="home-quick" aria-labelledby="home-quick-title">
      <h2 id="home-quick-title" className="meta">Atajos</h2>
      <div className="scroll-x home-quick-row">
        <button type="button" className="home-quick-item" onClick={() => start({ name: "Entrenamiento libre", records: [], source: { type: "free" } })}>
          <Label icon={<Dumbbell size={17} />}>Entreno libre</Label>
        </button>
        <button type="button" className="home-quick-item" onClick={startMobility}>
          <Label icon={<StretchHorizontal size={17} />}>Movilidad 10 min</Label>
        </button>
        <Link className="home-quick-item" href="/entrenar/intervalos">
          <Label icon={<Timer size={17} />}>Intervalos</Label>
        </Link>
        <Link className="home-quick-item" href="/comidas">
          <Label icon={<Utensils size={17} />}>Registrar comida</Label>
        </Link>
      </div>
    </section>
  );
}
