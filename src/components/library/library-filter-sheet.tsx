"use client";

import { muscleLabels, muscleRegions } from "@/data/catalog";
import { Button, SegmentedControl, Sheet, Switch, ToggleChip } from "@/components/ui";
import { LevelBars } from "@/components/library/library-card";
import {
  categoryOptions,
  equipmentOptions,
  levelOptions,
  type CategoryFilter,
  type LibraryFilters,
} from "@/components/library/library-filters";
import type { MuscleGroup } from "@/types";

type Patch = Partial<Omit<LibraryFilters, "query">>;

export const emptyFilterPatch: Required<Patch> = { muscles: [], category: "all", equipment: null, level: null, available: false, favorites: false };

/** Todos los filtros en una hoja. Se aplican al instante (y quedan en la URL); el botón sólo cierra. */
export function LibraryFilterSheet({ open, onClose, filters, onChange, resultCount, favoritesCount }: {
  open: boolean;
  onClose: () => void;
  filters: LibraryFilters;
  onChange: (patch: Patch) => void;
  resultCount: number;
  favoritesCount: number;
}) {
  const toggleMuscle = (muscle: MuscleGroup) => onChange({
    muscles: filters.muscles.includes(muscle) ? filters.muscles.filter((item) => item !== muscle) : [...filters.muscles, muscle],
  });
  const any = filters.muscles.length > 0 || filters.category !== "all" || filters.equipment !== null || filters.level !== null || filters.available || filters.favorites;

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Biblioteca" title="Filtros" className="lib-sheet">
      <section className="lib-sheet-group" aria-labelledby="lib-sheet-category">
        <h3 id="lib-sheet-category" className="meta">Categoría</h3>
        <SegmentedControl<CategoryFilter> label="Categoría" options={categoryOptions} value={filters.category} onChange={(category) => onChange({ category })} />
      </section>

      <section className="lib-sheet-group" aria-labelledby="lib-sheet-level">
        <h3 id="lib-sheet-level" className="meta">Nivel</h3>
        <div className="chips">
          {levelOptions.map((option) => (
            <ToggleChip key={option.value} pressed={filters.level === option.value} onChange={(pressed) => onChange({ level: pressed ? option.value : null })} icon={<LevelBars level={option.value} />}>
              {option.label}
            </ToggleChip>
          ))}
        </div>
      </section>

      <section className="lib-sheet-group" aria-labelledby="lib-sheet-muscle">
        <h3 id="lib-sheet-muscle" className="meta">Músculo</h3>
        {muscleRegions.map((region) => (
          <div key={region.id} className="lib-sheet-region" role="group" aria-label={region.label}>
            <p className="lib-sheet-region-label">{region.label}</p>
            <div className="chips">
              {region.muscles.map((muscle) => (
                <ToggleChip key={muscle} pressed={filters.muscles.includes(muscle)} onChange={() => toggleMuscle(muscle)}>{muscleLabels[muscle]}</ToggleChip>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="lib-sheet-group" aria-labelledby="lib-sheet-equipment">
        <h3 id="lib-sheet-equipment" className="meta">Equipo</h3>
        <div className="chips">
          {equipmentOptions.map((option) => (
            <ToggleChip key={option.value} pressed={filters.equipment === option.value} onChange={(pressed) => onChange({ equipment: pressed ? option.value : null })}>
              {option.label}
            </ToggleChip>
          ))}
        </div>
      </section>

      <section className="lib-sheet-group lib-sheet-switches">
        <div className="toggle-row">
          <span className="lib-sheet-switch-text">
            <strong>Sólo con mi equipo</strong>
            <small>Según el equipamiento que marcaste en Entrenar</small>
          </span>
          <Switch checked={filters.available} onChange={(available) => onChange({ available })} label="Sólo con mi equipo" />
        </div>
        <div className="toggle-row">
          <span className="lib-sheet-switch-text">
            <strong>Sólo favoritos</strong>
            <small>{favoritesCount ? `${favoritesCount} ${favoritesCount === 1 ? "guardado" : "guardados"}` : "Aún no guardas ninguno"}</small>
          </span>
          <Switch checked={filters.favorites} onChange={(favorites) => onChange({ favorites })} label="Sólo favoritos" />
        </div>
      </section>

      <div className="lib-sheet-actions">
        <Button variant="ghost" onClick={() => onChange(emptyFilterPatch)} disabled={!any}>Limpiar</Button>
        <Button block onClick={onClose}>
          {resultCount ? `Ver ${resultCount} ${resultCount === 1 ? "ejercicio" : "ejercicios"}` : "Sin resultados"}
        </Button>
      </div>
    </Sheet>
  );
}
