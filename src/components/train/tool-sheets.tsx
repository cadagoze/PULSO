"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Sheet, Stepper, Switch } from "@/components/ui";
import { estimateOneRepMax, loadForReps, plateBreakdown, roundTo, warmupSets } from "@/lib/progression";
import { useSettings } from "@/lib/store";
import { formatNumber, fromDisplayWeight, toDisplayWeight } from "@/lib/utils";

const percentages = [95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
const barOptions = [20, 15, 10] as const;

function parseNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function useUnit() {
  const [settings, update] = useSettings();
  const unit = settings.unit;
  const show = (kg: number, step = unit === "lb" ? 1 : 0.5) => formatNumber(roundTo(toDisplayWeight(kg, unit), step));
  return { settings, update, unit, show };
}

function LoadInput({ label, value, onChange, unit }: { label: string; value: string; onChange: (value: string) => void; unit: string }) {
  return (
    <label className="field train-load-field">
      {label}
      <span className="train-input-unit">
        <input type="text" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder="0" />
        <span>{unit}</span>
      </span>
    </label>
  );
}

export function OneRepMaxSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { unit, show } = useUnit();
  const [load, setLoad] = useState(unit === "lb" ? "135" : "60");
  const [reps, setReps] = useState(8);
  const kg = fromDisplayWeight(parseNumber(load), unit);
  const oneRepMax = estimateOneRepMax(kg, reps);

  return (
    <Sheet open={open} onClose={onClose} title="Calculadora de 1RM" eyebrow="Herramientas" className="train-tool-sheet">
      <div className="train-tool-inputs">
        <LoadInput label="Carga levantada" value={load} onChange={setLoad} unit={unit} />
        <div className="field">
          Repeticiones
          <Stepper label="repeticiones" value={reps} min={1} max={15} onChange={setReps} />
        </div>
      </div>
      <div className="train-result on-dark" aria-live="polite">
        <span className="eyebrow">1RM estimado</span>
        <strong className="num">{oneRepMax ? show(oneRepMax) : "—"}<small>{unit}</small></strong>
        <p className="muted">Fórmula de Epley. Es una estimación: úsala para planificar, no como máximo a probar.</p>
      </div>
      {oneRepMax > 0 && (
        <table className="train-table">
          <thead>
            <tr><th scope="col">% 1RM</th><th scope="col">Carga</th><th scope="col">Reps aprox.</th></tr>
          </thead>
          <tbody>
            {percentages.map((pct) => {
              const target = oneRepMax * (pct / 100);
              const estimatedReps = Array.from({ length: 30 }, (_, index) => index + 1).find((count) => loadForReps(oneRepMax, count) <= target + 1e-9) ?? 30;
              return (
                <tr key={pct}>
                  <td className="num">{pct}%</td>
                  <td className="num">{show(target)} {unit}</td>
                  <td className="num">{estimatedReps}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Sheet>
  );
}

export function PlatesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update, unit, show } = useUnit();
  const [target, setTarget] = useState(unit === "lb" ? "185" : "80");
  const kg = fromDisplayWeight(parseNumber(target), unit);
  const result = plateBreakdown(kg, settings.barWeight, settings.plates);
  const belowBar = kg > 0 && kg < settings.barWeight;

  return (
    <Sheet open={open} onClose={onClose} title="Calculadora de discos" eyebrow="Herramientas" className="train-tool-sheet">
      <LoadInput label="Carga total objetivo" value={target} onChange={setTarget} unit={unit} />
      <div className="field">
        Peso de la barra
        <div className="chips">
          {barOptions.map((bar) => (
            <button key={bar} type="button" className="chip num" aria-pressed={settings.barWeight === bar} onClick={() => update({ barWeight: bar })}>
              {show(bar)} {unit}
            </button>
          ))}
        </div>
      </div>

      <Barbell plates={result.perSide} />

      <div className="train-plate-summary" aria-live="polite">
        <div>
          <span className="eyebrow">Por lado</span>
          <p className="num">
            {result.perSide.length ? result.perSide.map((plate) => formatNumber(plate, 2)).join(" + ") : "Sólo la barra"}
            {result.perSide.length > 0 && " kg"}
          </p>
        </div>
        <div>
          <span className="eyebrow">Total</span>
          <p className="num">{show(result.achieved)} {unit}</p>
        </div>
      </div>
      {belowBar && (
        <div className="notice warn"><Info size={18} /><p>La carga es menor que la barra ({show(settings.barWeight)} {unit}).</p></div>
      )}
      {!belowBar && result.remainder > 0 && (
        <div className="notice warn">
          <Info size={18} />
          <p>No se puede armar exacto con tus discos: faltan {show(result.remainder, 0.01)} {unit}. Lo más cercano es {show(result.achieved)} {unit}.</p>
        </div>
      )}
      <p className="subtle train-foot">Discos disponibles (kg): {settings.plates.map((plate) => formatNumber(plate, 2)).join(", ")}.</p>
    </Sheet>
  );
}

const plateScale: Record<string, number> = { "25": 100, "20": 92, "15": 82, "10": 70, "5": 54, "2.5": 42, "1.25": 34 };

function Barbell({ plates }: { plates: number[] }) {
  const side = (mirror: boolean) => (
    <div className={mirror ? "train-bar-side left" : "train-bar-side"}>
      {plates.map((plate, index) => (
        <span
          key={index}
          className="train-plate"
          data-plate={String(plate)}
          style={{ height: `${plateScale[String(plate)] ?? 40}%` }}
        />
      ))}
    </div>
  );
  return (
    <div className="train-barbell" role="img" aria-label={plates.length ? `Barra con ${plates.length} discos por lado` : "Barra sin discos"}>
      <span className="train-bar-shaft" />
      {side(true)}
      <span className="train-bar-grip" />
      {side(false)}
    </div>
  );
}

export function WarmupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, unit, show } = useUnit();
  const [load, setLoad] = useState(unit === "lb" ? "185" : "80");
  const [barbell, setBarbell] = useState(true);
  const kg = fromDisplayWeight(parseNumber(load), unit);
  const sets = warmupSets(kg, barbell, settings.barWeight);

  return (
    <Sheet open={open} onClose={onClose} title="Series de calentamiento" eyebrow="Herramientas" className="train-tool-sheet">
      <LoadInput label="Carga de trabajo" value={load} onChange={setLoad} unit={unit} />
      <div className="toggle-row">
        <span>
          <strong>Con barra</strong>
          <small className="muted train-block">Empieza con la barra sola ({show(settings.barWeight)} {unit}).</small>
        </span>
        <Switch checked={barbell} onChange={setBarbell} label="Con barra" />
      </div>
      {sets.length ? (
        <table className="train-table">
          <thead>
            <tr><th scope="col">Serie</th><th scope="col">Carga</th><th scope="col">Reps</th><th scope="col">%</th></tr>
          </thead>
          <tbody>
            {sets.map((set, index) => (
              <tr key={index}>
                <td className="num">{index + 1}</td>
                <td className="num">{show(set.load)} {unit}</td>
                <td className="num">{set.value}</td>
                <td className="num subtle">{Math.round((set.load / kg) * 100)}%</td>
              </tr>
            ))}
            <tr className="train-table-work">
              <td>Trabajo</td>
              <td className="num">{show(kg)} {unit}</td>
              <td colSpan={2} className="subtle">Tus series efectivas</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div className="notice"><Info size={18} /><p>Con esta carga basta una serie liviana de 8–10 repeticiones antes de empezar.</p></div>
      )}
    </Sheet>
  );
}
