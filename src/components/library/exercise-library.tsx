"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SearchX, X } from "lucide-react";
import { exercises } from "@/data/mock-data";
import { muscleLabels, muscleRegions } from "@/data/catalog";
import { EmptyState, PageHeader, Segmented } from "@/components/ui";
import { MuscleMap } from "@/components/ui/muscle-map";
import { LibraryCard } from "@/components/library/library-card";
import {
  categoryOptions,
  equipmentOptions,
  hasActiveFilters,
  matchesEquipment,
  normalize,
  parseFilters,
  searchText,
  serializeFilters,
  type CategoryFilter,
  type LibraryFilters,
} from "@/components/library/library-filters";
import { availableEquipment, isAvailable } from "@/lib/generator";
import { useFavorites, usePreference } from "@/lib/store";
import type { Exercise, MuscleGroup } from "@/types";

const searchIndex = new Map(exercises.map((exercise) => [exercise.id, searchText(exercise)]));

export function ExerciseLibrary() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(new URLSearchParams(params.toString())), [params]);
  const [query, setQuery] = useState(filters.query);
  const [preference] = usePreference();
  const [favorites] = useFavorites();
  const equipment = useMemo(() => availableEquipment(preference), [preference]);

  const update = (patch: Partial<LibraryFilters>) => {
    const next = serializeFilters({ ...filters, query, ...patch });
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    update({ query: value });
  };

  const toggleMuscle = (muscle: MuscleGroup) => {
    const muscles = filters.muscles.includes(muscle)
      ? filters.muscles.filter((item) => item !== muscle)
      : [...filters.muscles, muscle];
    update({ muscles });
  };

  const clear = () => {
    setQuery("");
    router.replace(pathname, { scroll: false });
  };

  const results = useMemo(() => {
    const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
    const primaryFirst = (exercise: Exercise) => (filters.muscles.some((muscle) => exercise.primary.includes(muscle)) ? 0 : 1);
    return exercises.filter((exercise) =>
      words.every((word) => (searchIndex.get(exercise.id) ?? "").includes(word))
      && (filters.category === "all" || exercise.category === filters.category)
      && (!filters.muscles.length || filters.muscles.some((muscle) => exercise.primary.includes(muscle) || exercise.secondary.includes(muscle)))
      && (!filters.equipment || matchesEquipment(exercise, filters.equipment))
      && (!filters.available || isAvailable(exercise, equipment))
      && (!filters.favorites || favorites.includes(exercise.id)))
      .sort((a, b) => primaryFirst(a) - primaryFirst(b));
  }, [equipment, favorites, filters, query]);

  const active = hasActiveFilters({ ...filters, query });

  return (
    <div className="page lib-page">
      <PageHeader
        eyebrow="Biblioteca"
        title="Ejercicios"
        subtitle={`${exercises.length} movimientos con técnica paso a paso`}
      />

      <div className="lib-filters">
        <label className="lib-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar ejercicio</span>
          <input
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Busca por nombre o músculo"
            autoComplete="off"
            enterKeyHint="search"
          />
          {query && (
            <button type="button" onClick={() => changeQuery("")} aria-label="Borrar búsqueda">
              <X size={16} />
            </button>
          )}
        </label>

        <Segmented<CategoryFilter>
          label="Categoría"
          options={categoryOptions}
          value={filters.category}
          onChange={(category) => update({ category })}
        />

        <MuscleChips selected={filters.muscles} onToggle={toggleMuscle} />

        <div className="lib-filter-row" role="group" aria-label="Equipamiento">
          <span className="lib-filter-label">Equipo</span>
          <div className="scroll-x lib-chip-scroll">
            {equipmentOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="chip"
                aria-pressed={filters.equipment === option.value}
                onClick={() => update({ equipment: filters.equipment === option.value ? null : option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lib-toggles">
          <button
            type="button"
            className="chip lib-toggle"
            aria-pressed={filters.available}
            onClick={() => update({ available: !filters.available })}
          >
            Disponible con mi equipo
          </button>
          <button
            type="button"
            className="chip lib-toggle"
            aria-pressed={filters.favorites}
            onClick={() => update({ favorites: !filters.favorites })}
          >
            Favoritos{favorites.length ? <span className="num"> · {favorites.length}</span> : null}
          </button>
        </div>
      </div>

      {filters.muscles.length > 0 && <MuscleFocus muscles={filters.muscles} />}

      <section className="lib-results" aria-labelledby="lib-results-title">
        <div className="lib-results-head">
          <h2 id="lib-results-title" aria-live="polite">
            <span className="num">{results.length}</span>
            {results.length === 1 ? " ejercicio" : " ejercicios"}
          </h2>
          {active && (
            <button type="button" className="link-button lib-clear" onClick={clear}>
              Limpiar filtros
            </button>
          )}
        </div>

        {results.length ? (
          <div className="lib-grid">
            {results.map((exercise, index) => (
              <LibraryCard key={exercise.id} exercise={exercise} available={isAvailable(exercise, equipment)} eager={index < 4} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<SearchX size={20} />}
            title={filters.favorites && !favorites.length ? "Aún no tienes favoritos" : "Nada coincide con tu búsqueda"}
            action={<button type="button" className="btn btn-secondary btn-small" onClick={clear}>Limpiar filtros</button>}
          >
            {filters.favorites && !favorites.length
              ? "Toca la estrella de un ejercicio para tenerlo siempre a mano."
              : "Prueba con otro músculo o quita algún filtro."}
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function MuscleChips({ selected, onToggle }: { selected: MuscleGroup[]; onToggle: (muscle: MuscleGroup) => void }) {
  return (
    <div className="lib-filter-row" role="group" aria-label="Músculo">
      <span className="lib-filter-label">Músculo</span>
      <div className="scroll-x lib-chip-scroll">
        {muscleRegions.map((region) => (
          <div key={region.id} className="lib-region">
            <span className="lib-region-label">{region.label}</span>
            {region.muscles.map((muscle) => (
              <button
                key={muscle}
                type="button"
                className="chip"
                aria-pressed={selected.includes(muscle)}
                onClick={() => onToggle(muscle)}
              >
                {muscleLabels[muscle]}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MuscleFocus({ muscles }: { muscles: MuscleGroup[] }) {
  return (
    <aside className="lib-focus" aria-label="Músculos seleccionados">
      <MuscleMap primary={muscles} captions={false} className="lib-focus-map" label={`Seleccionado: ${muscles.map((muscle) => muscleLabels[muscle]).join(", ")}`} />
      <div>
        <p className="eyebrow">Enfoque</p>
        <p className="lib-focus-title">{muscles.map((muscle) => muscleLabels[muscle]).join(" · ")}</p>
        <p className="subtle">Incluye ejercicios donde trabaja como músculo principal o de apoyo.</p>
      </div>
    </aside>
  );
}
