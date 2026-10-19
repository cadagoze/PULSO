"use client";

import Link from "@/components/ui/app-link";
import { useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, Armchair, ArrowLeft, BookOpen, Calculator, ChevronRight, Disc3, Dumbbell, Flame, Library, Medal, StretchHorizontal, Timer } from "lucide-react";
import { ChallengesTab } from "@/components/progress/challenges-tab";
import { FitnessTestTab } from "@/components/fitness-test/fitness-test-tab";
import { OneRepMaxSheet, PlatesSheet, WarmupSheet } from "@/components/train/tool-sheets";
import { PageHeader } from "@/components/ui";
import { exercises } from "@/data/exercises";
import { testStatus } from "@/lib/fitness-test";
import { useStartMobility, useStartWorkout } from "@/lib/session";
import { useFitnessTests } from "@/lib/store";
import { useChallengeBoard } from "@/lib/use-challenges";
import { useNow } from "@/lib/use-now";
import { localDateKey } from "@/lib/utils";

type Sheet = "orm" | "plates" | "warmup";
type View = "retos" | "test";

const views: Record<View, { title: string; subtitle: string }> = {
  retos: { title: "Retos de 30 días", subtitle: "Una meta diaria por 30 días. Se cuenta sola con lo que registras." },
  test: { title: "Test físico", subtitle: "Cuatro pruebas cada 4 semanas: tu condición física en números." },
};

function isView(value: string | null): value is View {
  return value === "retos" || value === "test";
}

/**
 * Herramientas: lo útil que no es la rutina de hoy (sesiones sueltas, calculadoras, test físico, retos y
 * lecturas), reunido en una sola pantalla para que no compita con entrenar. `?tab=retos|test` abre cada
 * vista completa.
 */
export function ToolsHub() {
  const params = useSearchParams();
  const tab = params.get("tab");
  if (isView(tab)) return <ToolView key={tab} view={tab} />;
  return <ToolsList />;
}

function ToolView({ view }: { view: View }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="page tools-page tools-subview">
      <header className="page-header">
        <div>
          <button type="button" className="icon-button back" onClick={() => router.push(pathname)} aria-label="Volver a Herramientas">
            <ArrowLeft size={20} />
          </button>
          <p className="meta">Herramientas</p>
          <h1>{views[view].title}</h1>
          <p className="page-subtitle">{views[view].subtitle}</p>
        </div>
      </header>
      <div role="region" aria-label={views[view].title} className="prog-panel rise">
        {view === "retos" ? <ChallengesTab /> : <FitnessTestTab />}
      </div>
    </div>
  );
}

function ToolsList() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const start = useStartWorkout();
  const startMobility = useStartMobility();
  const now = useNow();
  const [tests] = useFitnessTests();
  const board = useChallengeBoard();
  const today = now ? localDateKey(new Date(now)) : "";
  const test = today ? testStatus(tests, today) : null;
  const close = () => setSheet(null);

  return (
    <div className="page tools-page">
      <PageHeader backHref="/entrenar" meta="Entrenar" title="Herramientas" subtitle="Para cuando quieres algo distinto a la rutina de hoy." />

      <Group title="Entrenar">
        <Row icon={<Dumbbell size={19} />} title="Entreno libre" detail="Registra lo que hagas, sin plan." onClick={() => void start({ name: "Entrenamiento libre", records: [], source: { type: "free" } })} />
        <Row icon={<StretchHorizontal size={19} />} title="Movilidad 10 min" detail="Para soltar el cuerpo o en días de descanso." onClick={() => void startMobility()} />
        <Row icon={<Timer size={19} />} title="Intervalos" detail="Tabata, EMOM y tus propios tiempos." href="/entrenar/intervalos" />
        <Row icon={<Armchair size={19} />} title="Pausas activas" detail="De 3 a 5 minutos para cortar el día sentado." href="/pausas" />
      </Group>

      <Group title="Calcular">
        <Row icon={<Calculator size={19} />} title="Calculadora 1RM" detail="Tu máximo estimado y cargas por porcentaje." onClick={() => setSheet("orm")} />
        <Row icon={<Disc3 size={19} />} title="Discos" detail="Qué discos poner a cada lado de la barra." onClick={() => setSheet("plates")} />
        <Row icon={<Flame size={19} />} title="Calentamiento" detail="Series de aproximación para tu carga." onClick={() => setSheet("warmup")} />
      </Group>

      <Group title="Medir y desafiarte">
        <Row
          icon={<Activity size={19} />}
          title="Test físico"
          detail={!test || test.due ? (test?.last ? "Toca repetirlo: mira cuánto mejoraste." : "Tu punto de partida en 12 minutos.") : `Próximo en ${test.daysLeft} ${test.daysLeft === 1 ? "día" : "días"}.`}
          href="/herramientas?tab=test"
        />
        <Row
          icon={<Medal size={19} />}
          title="Retos de 30 días"
          detail={board.active.length ? `${board.active.length} en curso · ${board.active[0].def.title}` : "Una meta diaria, con medalla al cumplirla."}
          href="/herramientas?tab=retos"
        />
      </Group>

      <Group title="Aprender">
        <Row icon={<Library size={19} />} title="Biblioteca de ejercicios" detail={`${exercises.length} ejercicios con su técnica.`} href="/ejercicios" />
        <Row icon={<BookOpen size={19} />} title="Guía" detail="Lecturas breves sobre fuerza, descanso y alimentación." href="/guia" />
      </Group>

      <OneRepMaxSheet open={sheet === "orm"} onClose={close} />
      <PlatesSheet open={sheet === "plates"} onClose={close} />
      <WarmupSheet open={sheet === "warmup"} onClose={close} />
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = `tools-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section className="tools-group" aria-labelledby={id}>
      <h2 id={id} className="meta">{title}</h2>
      <div className="list">{children}</div>
    </section>
  );
}

function Row({ icon, title, detail, href, onClick }: { icon: ReactNode; title: string; detail: string; href?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="icon-tile" aria-hidden="true">{icon}</span>
      <span className="grow"><strong>{title}</strong><small>{detail}</small></span>
      <ChevronRight size={18} className="subtle" aria-hidden="true" />
    </>
  );
  return href
    ? <Link href={href} className="list-row">{body}</Link>
    : <button type="button" className="list-row" onClick={onClick}>{body}</button>;
}
