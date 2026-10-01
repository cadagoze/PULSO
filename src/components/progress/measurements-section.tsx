"use client";

import { useState } from "react";
import { Plus, Ruler } from "lucide-react";
import { EmptyState, Sheet } from "@/components/ui";
import { signed } from "@/components/progress/format";
import { useMeasurements } from "@/lib/store";
import { formatNumber, formatShortDate, localDateKey } from "@/lib/utils";
import type { MeasurementEntry } from "@/types";

type Field = Exclude<keyof MeasurementEntry, "date">;

const fields: Array<{ key: Field; label: string }> = [
  { key: "waist", label: "Cintura" },
  { key: "chest", label: "Pecho" },
  { key: "hips", label: "Cadera" },
  { key: "arm", label: "Brazo" },
  { key: "thigh", label: "Muslo" },
];

type Draft = Record<Field, string>;
const emptyDraft: Draft = { waist: "", chest: "", hips: "", arm: "", thigh: "" };

export function MeasurementsSection() {
  const [entries, setEntries] = useMeasurements();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [date, setDate] = useState("");
  const [today, setToday] = useState("");
  const [error, setError] = useState("");
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const cm = (value: number) => `${formatNumber(value)} cm`;

  function openSheet() {
    const key = localDateKey();
    setToday(key);
    setDate(key);
    setDraft(emptyDraft);
    setError("");
    setOpen(true);
  }

  function save() {
    const entry: MeasurementEntry = { date };
    for (const field of fields) {
      const raw = draft[field.key].trim();
      if (!raw) continue;
      const value = Number(raw.replace(",", "."));
      if (!Number.isFinite(value) || value < 15 || value > 250) {
        setError(`${field.label}: ingresa un valor entre 15 y 250 cm.`);
        return;
      }
      entry[field.key] = Math.round(value * 10) / 10;
    }
    if (fields.every((field) => entry[field.key] === undefined)) {
      setError("Completa al menos una medida.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) {
      setError("Elige una fecha válida, de hoy o anterior.");
      return;
    }
    setEntries((current) => [...current.filter((item) => item.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date)));
    setOpen(false);
  }

  const rows = fields
    .map((field) => {
      const withValue = sorted.filter((entry) => entry[field.key] !== undefined);
      const first = withValue[0];
      const last = withValue.at(-1);
      return { ...field, first: first?.[field.key], last: last?.[field.key], lastDate: last?.date };
    })
    .filter((row) => row.last !== undefined);

  return (
    <section className="prog-stack-s" aria-labelledby="prog-measures-title">
      <div className="section-head">
        <h2 id="prog-measures-title">Medidas</h2>
        <button type="button" className="btn btn-secondary btn-small" onClick={openSheet}>
          <Plus size={16} aria-hidden="true" />
          Registrar medidas
        </button>
      </div>

      {rows.length ? (
        <div className="card prog-measures">
          <table className="prog-table">
            <thead>
              <tr>
                <th scope="col">Medida</th>
                <th scope="col">Inicio</th>
                <th scope="col">Actual</th>
                <th scope="col">Cambio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  <td className="num">{row.first !== undefined ? cm(row.first) : "—"}</td>
                  <td className="num">{row.last !== undefined ? cm(row.last) : "—"}</td>
                  <td className="num prog-table-delta">
                    {row.first !== undefined && row.last !== undefined ? signed(row.last - row.first, cm) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="subtle prog-measures-foot">
            {sorted.length} {sorted.length === 1 ? "registro" : "registros"} · último el {formatShortDate(sorted[sorted.length - 1].date)}
          </p>
        </div>
      ) : (
        <EmptyState icon={<Ruler size={20} />} title="Aún no registras medidas">
          La cintura y otras medidas muestran cambios que la balanza no ve. Mide con la cinta ajustada, sin apretar, una vez al mes.
        </EmptyState>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} eyebrow="Nuevo registro" title="Registrar medidas" className="prog-form-sheet">
        <p className="subtle prog-sheet-help">Completa solo las que quieras seguir, en centímetros.</p>
        <div className="prog-measure-fields">
          {fields.map((field) => (
            <label key={field.key} className="field">
              {field.label} (cm)
              <input
                inputMode="decimal"
                value={draft[field.key]}
                onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
              />
            </label>
          ))}
        </div>
        <label className="field">
          Fecha
          <input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="button" className="btn btn-primary btn-block" onClick={save}>Guardar medidas</button>
      </Sheet>
    </section>
  );
}
