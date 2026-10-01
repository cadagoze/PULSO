"use client";

import { useState } from "react";
import { Plus, Scale } from "lucide-react";
import { EmptyState, Sheet } from "@/components/ui";
import { signed, weightLabel } from "@/components/progress/format";
import { WeightChart } from "@/components/progress/weight-chart";
import { useSettings, useWeights } from "@/lib/store";
import { formatShortDate, fromDisplayWeight, localDateKey, toDisplayWeight } from "@/lib/utils";

export function WeightSection() {
  const [entries, setEntries] = useWeights();
  const [settings] = useSettings();
  const unit = settings.unit;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [today, setToday] = useState("");

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted.at(-1);
  const lowest = sorted.length ? Math.min(...sorted.map((entry) => entry.weight)) : 0;
  const change = first && last ? last.weight - first.weight : 0;
  const format = (kg: number) => weightLabel(kg, unit);

  function openSheet() {
    setValue(last ? String(toDisplayWeight(last.weight, unit)).replace(".", ",") : "");
    const key = localDateKey();
    setToday(key);
    setDate(key);
    setError("");
    setOpen(true);
  }

  function save() {
    const parsed = Number(value.trim().replace(",", "."));
    const kg = fromDisplayWeight(parsed, unit);
    if (!value.trim() || !Number.isFinite(parsed) || kg < 30 || kg > 300) {
      setError(`Ingresa un peso entre ${format(30)} y ${format(300)}.`);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) {
      setError("Elige una fecha válida, de hoy o anterior.");
      return;
    }
    const entry = { date, label: formatShortDate(date), weight: Math.round(kg * 100) / 100 };
    setEntries((current) => [...current.filter((item) => item.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date)));
    setOpen(false);
  }

  return (
    <section className="prog-stack-s" aria-labelledby="prog-weight-title">
      <div className="section-head">
        <h2 id="prog-weight-title">Peso</h2>
        <button type="button" className="btn btn-primary btn-small" onClick={openSheet}>
          <Plus size={16} aria-hidden="true" />
          Registrar peso
        </button>
      </div>

      {last && first ? (
        <div className="card card-l prog-weight">
          <dl className="prog-weight-stats">
            <div className="prog-weight-current">
              <dt>Actual · {formatShortDate(last.date)}</dt>
              <dd className="num">{format(last.weight)}</dd>
            </div>
            <div>
              <dt>Desde el inicio</dt>
              <dd className="num">{signed(change, format)}</dd>
            </div>
            <div>
              <dt>Más bajo</dt>
              <dd className="num">{format(lowest)}</dd>
            </div>
          </dl>
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

      <Sheet open={open} onClose={() => setOpen(false)} eyebrow="Nuevo registro" title="Registrar peso" className="prog-form-sheet">
        <label className="field">
          Peso ({unit})
          <input
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "prog-weight-error" : undefined}
            placeholder={unit === "kg" ? "Ej. 78,5" : "Ej. 173"}
          />
        </label>
        <label className="field">
          Fecha
          <input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} />
        </label>
        {error && <p className="form-error" id="prog-weight-error" role="alert">{error}</p>}
        <p className="subtle prog-sheet-help">Si ya registraste ese día, el valor se reemplaza.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={save}>Guardar registro</button>
      </Sheet>
    </section>
  );
}
