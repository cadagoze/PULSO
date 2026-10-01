"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Dumbbell, Library, StretchHorizontal, Timer } from "lucide-react";
import { generateWorkout, levelFromActivities } from "@/lib/generator";
import { useStartWorkout } from "@/lib/session";
import { usePreference, useProfile } from "@/lib/store";
import { dayOfYear, profileLimitations } from "./helpers";

function Tile({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <>
      <span className="home-tile-icon" aria-hidden="true">{icon}</span>
      <span className="home-tile-text">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </>
  );
}

export function QuickActions() {
  const start = useStartWorkout();
  const [preference] = usePreference();
  const [profile] = useProfile();

  function startMobility() {
    const now = Date.now();
    const workout = generateWorkout({
      preference,
      minutes: 10,
      focus: "mobility",
      level: levelFromActivities(profile?.activities),
      limitations: profileLimitations(profile?.limitations),
      seed: dayOfYear(now),
    });
    start({ name: "Movilidad 10 min", records: workout.records, restSeconds: workout.restSeconds, source: { type: "generated" } });
  }

  return (
    <section className="section home-quick" aria-labelledby="home-quick-title">
      <h2 id="home-quick-title" className="home-section-title">Accesos rápidos</h2>
      <div className="home-tiles">
        <button className="home-tile" onClick={() => start({ name: "Entrenamiento libre", records: [], source: { type: "free" } })}>
          <Tile icon={<Dumbbell size={20} />} title="Entrenamiento libre" detail="Elige sobre la marcha" />
        </button>
        <Link className="home-tile" href="/entrenar/intervalos">
          <Tile icon={<Timer size={20} />} title="Intervalos" detail="Tabata, EMOM y más" />
        </Link>
        <button className="home-tile" onClick={startMobility}>
          <Tile icon={<StretchHorizontal size={20} />} title="Movilidad 10 min" detail="Suelta el cuerpo" />
        </button>
        <Link className="home-tile" href="/ejercicios">
          <Tile icon={<Library size={20} />} title="Explorar ejercicios" detail="Técnica paso a paso" />
        </Link>
      </div>
    </section>
  );
}
