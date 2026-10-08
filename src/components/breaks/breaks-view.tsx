"use client";

import Link from "@/components/ui/app-link";
import { BellRing, ChevronRight, Play } from "lucide-react";
import { ExerciseIllustration } from "@/components/exercises/exercise-illustration";
import { PageHeader, Switch } from "@/components/ui";
import { breakMoveById, breakRoutines, type BreakRoutine } from "@/data/active-breaks";
import { breaksOn, routineMinutes, suggestedRoutine } from "@/lib/active-breaks";
import { usePushSettings, usePushSupport } from "@/lib/push";
import { useBreaks } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { localDateKey } from "@/lib/utils";

function moveNames(routine: BreakRoutine) {
  return [...new Set(routine.items.map((item) => breakMoveById.get(item.move)?.name).filter(Boolean))].join(" · ");
}

/** Pausas activas: la recomendada ahora, todas las rutinas, cuántas llevas hoy y el aviso. */
export function BreaksView() {
  const now = useNow();
  const [entries] = useBreaks();
  const [push, setPush] = usePushSettings();
  const support = usePushSupport();
  const today = now ? localDateKey(new Date(now)) : "";
  const count = today ? breaksOn(entries, today) : 0;
  const suggested = suggestedRoutine(entries, today);
  const first = breakMoveById.get(suggested.items[0]?.move ?? "");
  const pushActive = push.enabled && support === "ready";

  return (
    <div className="page brk-page">
      <PageHeader backHref="/entrenar" meta="Para quien trabaja sentado" title="Pausas activas" subtitle="3 a 5 minutos junto a tu escritorio, sin equipo. Suelta el cuerpo y vuelve con más foco." />

      <section className="brk-today" aria-label="Pausas de hoy">
        <span className="brk-today-num num-display">{count}</span>
        <span className="grow">
          <strong>{count === 1 ? "pausa hoy" : "pausas hoy"}</strong>
          <small>Lo ideal: una cada dos horas sentado.</small>
        </span>
      </section>

      <section className="section" aria-labelledby="brk-now-title">
        <h2 id="brk-now-title" className="meta">Recomendada ahora</h2>
        <Link href={`/pausas/${suggested.id}`} className="brk-hero on-dark">
          {first && <span className="brk-hero-ill" aria-hidden="true"><ExerciseIllustration spec={first.illustration} primary={first.primary} panels="end" /></span>}
          <span className="brk-hero-body">
            <span className="meta">{routineMinutes(suggested)} min · {suggested.items.length} movimientos</span>
            <strong>{suggested.name}</strong>
            <small>{suggested.detail}</small>
          </span>
          <span className="brk-hero-play" aria-hidden="true"><Play size={20} fill="currentColor" /></span>
        </Link>
      </section>

      <section className="section" aria-labelledby="brk-all-title">
        <h2 id="brk-all-title" className="meta">Todas las pausas</h2>
        <ul className="list brk-list">
          {breakRoutines.filter((routine) => routine.id !== suggested.id).map((routine) => (
            <li key={routine.id}>
              <Link href={`/pausas/${routine.id}`} className="list-row">
                <span className="brk-list-min num" aria-hidden="true">{routineMinutes(routine)}<small>min</small></span>
                <span className="grow"><strong>{routine.name}</strong><small>{moveNames(routine)}</small></span>
                <ChevronRight size={18} className="subtle" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="brk-remind" aria-label="Aviso de pausas">
        <span className="icon-tile" aria-hidden="true"><BellRing size={18} /></span>
        <span className="grow">
          <strong>Recuérdamelo</strong>
          <small>{pushActive ? "A las 11:00 y 16:00, de lunes a viernes, si aún no haces tu pausa." : "Activa los avisos en Ajustes y te recordamos tus pausas."}</small>
        </span>
        {pushActive ? (
          <Switch checked={push.prefs.breaks ?? false} onChange={(on) => setPush((current) => ({ ...current, prefs: { ...current.prefs, breaks: on } }))} label="Avisos de pausas activas" />
        ) : (
          <Link href="/ajustes#avisos" className="btn btn-secondary btn-small">Activar</Link>
        )}
      </section>
    </div>
  );
}
