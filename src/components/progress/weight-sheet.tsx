"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Sheet } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/toast";
import { weightLabel } from "@/components/progress/format";
import { useSettings, useWeights } from "@/lib/store";
import { formatShortDate, fromDisplayWeight, localDateKey, toDisplayWeight } from "@/lib/utils";

/** Botón «Registrar peso» con su hoja: valida el valor (30–300 kg) y la fecha, y reemplaza el registro del mismo día. */
export function WeightLogButton({ variant = "secondary", size = "s", block = false, label = "Registrar peso", className }: { variant?: "primary" | "secondary" | "dark"; size?: "s" | "m"; block?: boolean; label?: string; className?: string }) {
  const [entries, setEntries] = useWeights();
  const [settings] = useSettings();
  const unit = settings.unit;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [today, setToday] = useState("");
  const { toast, show } = useToast();
  const format = (kg: number) => weightLabel(kg, unit);

  function openSheet() {
    const last = [...entries].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
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
    // El aviso aparece cuando la hoja ya se cerró (con una hoja abierta, los avisos suben arriba).
    show(`Peso registrado · ${format(entry.weight)}`, { delay: 260 });
  }

  return (
    <>
      <Button variant={variant} size={size} block={block} className={className} onClick={openSheet}>
        <Plus size={16} aria-hidden="true" />
        {label}
      </Button>
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
        <Button block onClick={save}>Guardar registro</Button>
      </Sheet>
      <Toast toast={toast} />
    </>
  );
}
