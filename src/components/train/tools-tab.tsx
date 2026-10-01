"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, Calculator, Disc3, Flame, Timer } from "lucide-react";
import { OneRepMaxSheet, PlatesSheet, WarmupSheet } from "@/components/train/tool-sheets";

type Tool = "orm" | "plates" | "warmup";

export function ToolsTab() {
  const [open, setOpen] = useState<Tool | null>(null);
  const close = () => setOpen(null);
  return (
    <div className="train-tools">
      <Link href="/entrenar/intervalos" className="train-tool train-tool-feature">
        <span className="train-tool-icon"><Timer size={22} /></span>
        <span className="grow">
          <strong>Temporizador de intervalos</strong>
          <small>Tabata, HIIT, EMOM y circuitos con aviso sonoro.</small>
        </span>
        <ArrowRight size={18} />
      </Link>
      <ToolCard icon={<Calculator size={22} />} title="Calculadora de 1RM" detail="Estima tu máximo y las cargas por porcentaje." onClick={() => setOpen("orm")} />
      <ToolCard icon={<Disc3 size={22} />} title="Calculadora de discos" detail="Qué discos poner en cada lado de la barra." onClick={() => setOpen("plates")} />
      <ToolCard icon={<Flame size={22} />} title="Series de calentamiento" detail="Aproximaciones hasta tu carga de trabajo." onClick={() => setOpen("warmup")} />

      <OneRepMaxSheet open={open === "orm"} onClose={close} />
      <PlatesSheet open={open === "plates"} onClose={close} />
      <WarmupSheet open={open === "warmup"} onClose={close} />
    </div>
  );
}

function ToolCard({ icon, title, detail, onClick }: { icon: ReactNode; title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" className="train-tool" onClick={onClick}>
      <span className="train-tool-icon">{icon}</span>
      <span className="grow">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ArrowRight size={18} />
    </button>
  );
}
