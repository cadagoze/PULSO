"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Sheet } from "@/components/ui";
import { MuscleMap, RecoveryLegend } from "@/components/ui/muscle-map";
import { muscleLabels } from "@/data/catalog";
import { MuscleEvidence, MuscleList, muscleHeat, muscleVolume } from "@/components/progress/muscle-volume";
import type { PeriodSummary } from "@/components/progress/period";
import { recoveryLines, recoverySummary } from "@/components/progress/recovery-card";
import { muscleRecovery } from "@/lib/analytics";
import { levelFromActivities } from "@/lib/generator";
import { useProfile } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

type Mode = "volume" | "recovery";

const scopes: Record<PeriodSummary["period"], { label: string; empty: string; sheet: string }> = {
  semana: { label: "Series esta semana", empty: "Sin series registradas esta semana.", sheet: "Esta semana" },
  mes: { label: "Media semanal · 30 días", empty: "Sin series en los últimos 30 días.", sheet: "Media semanal · 30 días" },
  ano: { label: "Media semanal · 12 meses", empty: "Sin series en los últimos 12 meses.", sheet: "Media semanal · 12 meses" },
};

/** Volumen por músculo del periodo y recuperación de hoy, en un solo mapa con dos lecturas. */
export function MusclesSection({ workouts, summary, nowMs }: { workouts: WorkoutEntry[]; summary: PeriodSummary; nowMs: number }) {
  const [profile] = useProfile();
  const [mode, setMode] = useState<Mode>("volume");
  const [open, setOpen] = useState(false);
  const beginner = levelFromActivities(profile?.activities) === 1;
  const data = muscleVolume(workouts, summary.start, summary.end, summary.activeWeeks, beginner);
  const recovery = muscleRecovery(workouts, nowMs);
  const trained = data.rows.filter((muscle) => data.sets[muscle] > 0).slice(0, 4);
  const scope = scopes[summary.period];
  const lines = recoveryLines(recovery);

  return (
    <section className="section prog-muscles" aria-labelledby="prog-muscles-title">
      <div className="section-head">
        <h2 id="prog-muscles-title">Músculos trabajados</h2>
        <button type="button" className="link" onClick={() => setOpen(true)}>Detalle<ArrowRight size={15} aria-hidden="true" /></button>
      </div>
      <div className="card prog-muscles-card">
        <div className="chips prog-toggle" role="group" aria-label="Qué muestra el mapa">
          <button type="button" className="chip" aria-pressed={mode === "volume"} onClick={() => setMode("volume")}>Trabajo</button>
          <button type="button" className="chip" aria-pressed={mode === "recovery"} onClick={() => setMode("recovery")}>Recuperación</button>
        </div>
        <div className="prog-muscles-body">
          <div className="prog-muscles-map">
            <MuscleMap
              mode={mode === "volume" ? "heat" : "recovery"}
              values={mode === "volume" ? muscleHeat(data) : recovery}
              label={mode === "volume" ? "Mapa de series por músculo" : "Mapa de recuperación muscular"}
            />
          </div>
          <div className="prog-muscles-info" aria-live="polite">
            {mode === "volume" ? (
              <>
                <p className="meta">{scope.label}</p>
                {trained.length ? (
                  <ol className="prog-muscle-top">
                    {trained.map((muscle) => (
                      <li key={muscle}>
                        <span>{muscleLabels[muscle]}</span>
                        <b className="num">{formatNumber(data.sets[muscle])}</b>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="prog-muscles-empty">{scope.empty}</p>
                )}
                <p className="prog-muscles-note">
                  <span className="num">{data.inRange}</span> de {data.rows.length} en el rango de <span className="prog-nowrap">{data.low}–{data.high} series</span>
                </p>
                <div className="prog-heat-scale" aria-hidden="true"><span>0</span><i /><span>{data.high}+</span></div>
              </>
            ) : (
              <>
                <p className="meta">Recuperación ahora</p>
                {workouts.length > 0 && (
                  <ul className="prog-recovery-lines">
                    {lines.map((line) => (
                      <li key={line.label} className={cn(line.ready ? "is-ready" : "is-tired")}><span>{line.label}</span><small>{line.state}</small></li>
                    ))}
                  </ul>
                )}
                <p className="prog-muscles-note">{recoverySummary(recovery, workouts.length > 0)}</p>
                <RecoveryLegend />
              </>
            )}
          </div>
        </div>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} eyebrow={scope.sheet} title="Series por músculo" className="prog-muscles-sheet">
        <p className="muted prog-sheet-help">
          <span className="num">{data.inRange}</span> de {data.rows.length} músculos en el rango de {data.low}–{data.high} series semanales.
        </p>
        <MuscleList data={data} />
        <MuscleEvidence beginner={beginner} />
      </Sheet>
    </section>
  );
}
