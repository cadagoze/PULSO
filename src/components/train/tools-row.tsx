"use client";

import Link from "@/components/ui/app-link";
import { useState } from "react";
import type { ReactNode } from "react";
import { Calculator, Disc3, Dumbbell, Flame, StretchHorizontal, Timer } from "lucide-react";
import { OneRepMaxSheet, PlatesSheet, WarmupSheet } from "@/components/train/tool-sheets";
import { generateWorkout, levelFromActivities, profileLimitations } from "@/lib/generator";
import { useStartWorkout } from "@/lib/session";
import { usePreference, useProfile } from "@/lib/store";
import { localDaySeed } from "@/lib/utils";

type Tool = "orm" | "plates" | "warmup";

function Label({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <>
      <span className="train-tool-icon" aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </>
  );
}

/** Sesiones rápidas (libre y movilidad), calculadoras y el temporizador de intervalos como una fila ligera de píldoras. */
export function ToolsRow() {
  const [open, setOpen] = useState<Tool | null>(null);
  const close = () => setOpen(null);
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
      seed: localDaySeed(Date.now()),
    });
    start({ name: "Movilidad 10 min", records: workout.records, restSeconds: workout.restSeconds, source: { type: "generated" } });
  }

  return (
    <section id="herramientas" className="train-tools" aria-labelledby="train-tools-title">
      <h2 id="train-tools-title" className="meta">Herramientas</h2>
      <div className="train-tools-row">
        <button type="button" className="train-tool" onClick={() => start({ name: "Entrenamiento libre", records: [], source: { type: "free" } })}>
          <Label icon={<Dumbbell size={17} />}>Entreno libre</Label>
        </button>
        <button type="button" className="train-tool" onClick={startMobility}>
          <Label icon={<StretchHorizontal size={17} />}>Movilidad 10 min</Label>
        </button>
        <button type="button" className="train-tool" onClick={() => setOpen("orm")}>
          <Label icon={<Calculator size={17} />}>Calculadora 1RM</Label>
        </button>
        <button type="button" className="train-tool" onClick={() => setOpen("plates")}>
          <Label icon={<Disc3 size={17} />}>Discos</Label>
        </button>
        <button type="button" className="train-tool" onClick={() => setOpen("warmup")}>
          <Label icon={<Flame size={17} />}>Calentamiento</Label>
        </button>
        <Link href="/entrenar/intervalos" className="train-tool">
          <Label icon={<Timer size={17} />}>Intervalos</Label>
        </Link>
      </div>
      <OneRepMaxSheet open={open === "orm"} onClose={close} />
      <PlatesSheet open={open === "plates"} onClose={close} />
      <WarmupSheet open={open === "warmup"} onClose={close} />
    </section>
  );
}
