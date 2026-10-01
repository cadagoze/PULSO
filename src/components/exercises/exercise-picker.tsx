"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { exercises } from "@/data/mock-data";
import { muscleRegions } from "@/data/catalog";
import { Sheet } from "@/components/ui";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { equipmentText } from "@/components/exercises/exercise-technique";
import { alternativesFor, availableEquipment, isAvailable } from "@/lib/generator";
import { usePreference } from "@/lib/store";
import { normalizeText } from "@/lib/utils";
import type { Exercise } from "@/types";

/**
 * Selector de ejercicios en hoja inferior. Con `replacing` muestra primero alternativas
 * del mismo patrón (sustitución), como en las apps líderes.
 */
export function ExercisePicker({ open, onClose, onSelect, title = "Agregar ejercicio", replacing, exclude = [], multiple = false }: { open: boolean; onClose: () => void; onSelect: (exercises: Exercise[]) => void; title?: string; replacing?: Exercise; exclude?: number[]; multiple?: boolean }) {
  const [preference] = usePreference();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<"all" | "upper" | "core" | "lower" | "cardio" | "mobility">("all");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const equipment = useMemo(() => availableEquipment(preference), [preference]);

  const list = useMemo(() => {
    const base = replacing ? [...alternativesFor(replacing), ...exercises.filter((item) => item.pattern !== replacing.pattern && item.id !== replacing.id)] : exercises;
    const text = normalizeText(query.trim());
    const regionMuscles = muscleRegions.find((item) => item.id === region)?.muscles;
    return base.filter((exercise) =>
      !exclude.includes(exercise.id)
      && (!onlyAvailable || isAvailable(exercise, equipment))
      && (!text || normalizeText(`${exercise.name} ${exercise.muscle}`).includes(text))
      && (region === "all"
        || (region === "cardio" ? exercise.category === "cardio"
          : region === "mobility" ? exercise.category === "mobility"
            : exercise.category === "strength" && exercise.primary.some((muscle) => regionMuscles?.includes(muscle)))));
  }, [equipment, exclude, onlyAvailable, query, region, replacing]);

  function close() {
    setSelected([]);
    setQuery("");
    onClose();
  }

  function choose(exercise: Exercise) {
    if (!multiple) {
      onSelect([exercise]);
      close();
      return;
    }
    setSelected((items) => items.includes(exercise.id) ? items.filter((id) => id !== exercise.id) : [...items, exercise.id]);
  }

  const alternativeIds = replacing ? new Set(alternativesFor(replacing).map((item) => item.id)) : null;

  return (
    <Sheet open={open} onClose={close} title={replacing ? `Cambiar ${replacing.name}` : title} eyebrow={replacing ? "Sustituir ejercicio" : "Biblioteca"} className="picker-sheet">
      <label className="picker-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o músculo" aria-label="Buscar ejercicio" /></label>
      <div className="scroll-x">
        {([["all", "Todos"], ["upper", "Tren superior"], ["core", "Centro"], ["lower", "Tren inferior"], ["cardio", "Cardio"], ["mobility", "Movilidad"]] as const).map(([value, label]) => (
          <button key={value} className="chip" aria-pressed={region === value} onClick={() => setRegion(value)}>{label}</button>
        ))}
      </div>
      <label className="toggle-row picker-toggle"><span>Sólo con mi equipamiento</span><input type="checkbox" checked={onlyAvailable} onChange={(event) => setOnlyAvailable(event.target.checked)} /></label>
      <div className="list picker-list">
        {list.map((exercise) => {
          const isSelected = selected.includes(exercise.id);
          return (
            <button key={exercise.id} className="list-row" onClick={() => choose(exercise)} aria-pressed={multiple ? isSelected : undefined}>
              <ExerciseVisual exercise={exercise} size="thumb" />
              <span className="grow">
                <strong>{exercise.name}</strong>
                <small>{exercise.muscle} · {equipmentText(exercise)}</small>
              </span>
              {alternativeIds?.has(exercise.id) && <span className="badge">Alternativa</span>}
              {multiple && <span className={isSelected ? "picker-check on" : "picker-check"}>{isSelected && <Check size={14} />}</span>}
            </button>
          );
        })}
        {!list.length && <p className="list-row muted">Sin resultados. Prueba otra búsqueda o desactiva el filtro de equipamiento.</p>}
      </div>
      {multiple && <button className="btn btn-primary btn-block" disabled={!selected.length} onClick={() => { onSelect(selected.map((id) => exercises.find((item) => item.id === id)).filter((item): item is Exercise => Boolean(item))); close(); }}>Agregar {selected.length || ""} {selected.length === 1 ? "ejercicio" : "ejercicios"}</button>}
    </Sheet>
  );
}
