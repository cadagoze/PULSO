"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { Calculator, Disc3, Flame, Timer } from "lucide-react";
import { OneRepMaxSheet, PlatesSheet, WarmupSheet } from "@/components/train/tool-sheets";

type Tool = "orm" | "plates" | "warmup";

function Label({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <>
      <span className="train-tool-icon" aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </>
  );
}

/** Calculadoras y el temporizador de intervalos como una fila ligera de píldoras. */
export function ToolsRow() {
  const [open, setOpen] = useState<Tool | null>(null);
  const close = () => setOpen(null);
  return (
    <section id="herramientas" className="train-tools" aria-labelledby="train-tools-title">
      <h2 id="train-tools-title" className="meta">Herramientas</h2>
      <div className="train-tools-row">
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
