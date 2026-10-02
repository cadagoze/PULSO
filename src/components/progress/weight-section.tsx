"use client";

import { useMemo } from "react";
import { Scale } from "lucide-react";
import { EmptyState, NumberMetric } from "@/components/ui";
import { signed, weightLabel } from "@/components/progress/format";
import { WeightChart } from "@/components/progress/weight-chart";
import { WeightLogButton } from "@/components/progress/weight-sheet";
import { useSettings, useWeights } from "@/lib/store";
import { formatShortDate, toDisplayWeight } from "@/lib/utils";

/** Peso: último registro en grande, variación desde el inicio, el más bajo y la gráfica con la media móvil. */
export function WeightSection() {
  const [entries] = useWeights();
  const [settings] = useSettings();
  const unit = settings.unit;
  const sorted = useMemo(() => [...entries].sort((a, b) => a.date.localeCompare(b.date)), [entries]);
  const first = sorted[0];
  const last = sorted.at(-1);
  const lowest = sorted.length ? Math.min(...sorted.map((entry) => entry.weight)) : 0;
  const change = first && last ? last.weight - first.weight : 0;
  const format = (kg: number) => weightLabel(kg, unit);

  return (
    <section className="section" aria-labelledby="prog-weight-title">
      <div className="section-head">
        <h2 id="prog-weight-title">Peso</h2>
        <WeightLogButton variant="primary" />
      </div>

      {last && first ? (
        <div className="card card-l prog-weight">
          <div className="prog-weight-stats">
            <NumberMetric
              size="l"
              value={toDisplayWeight(last.weight, unit).toLocaleString("es-CL", { maximumFractionDigits: 1 })}
              unit={unit}
              label={`Último registro · ${formatShortDate(last.date)}`}
            />
            <dl>
              <div>
                <dt className="meta">Desde el {formatShortDate(first.date)}</dt>
                <dd className="num">{signed(change, format)}</dd>
              </div>
              <div>
                <dt className="meta">Más bajo</dt>
                <dd className="num">{format(lowest)}</dd>
              </div>
            </dl>
          </div>
          <WeightChart entries={sorted} unit={unit} />
          <p className="prog-calm">
            Tu peso puede variar 1–2 kg de un día a otro por agua, sal, sueño o digestión. Mira la línea de la media: muestra la tendencia real.
          </p>
        </div>
      ) : (
        <EmptyState icon={<Scale size={20} />} title="Sin registros de peso">
          Pésate cuando quieras, idealmente en condiciones parecidas. Con varios registros verás tu tendencia.
        </EmptyState>
      )}
    </section>
  );
}
