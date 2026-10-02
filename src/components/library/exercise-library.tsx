"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dumbbell, Lock, Search, SearchX, SlidersHorizontal, Star, X } from "lucide-react";
import { exercises } from "@/data/mock-data";
import { levelLabels, muscleLabels } from "@/data/catalog";
import { Button, EmptyState, ToggleChip } from "@/components/ui";
import { MuscleMap } from "@/components/ui/muscle-map";
import { LibraryCard } from "@/components/library/library-card";
import { LibraryFeatured } from "@/components/library/library-featured";
import { LibraryFilterSheet } from "@/components/library/library-filter-sheet";
import {
  categoryOptions,
  equipmentOptions,
  groupExercises,
  hasActiveFilters,
  matchesEquipment,
  normalize,
  parseFilters,
  searchText,
  serializeFilters,
  sheetFilterCount,
  type LibraryFilters,
} from "@/components/library/library-filters";
import { availableEquipment, isAvailable } from "@/lib/generator";
import { useFavorites, usePreference } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Equipment, Exercise, MuscleGroup } from "@/types";

const searchIndex = new Map(exercises.map((exercise) => [exercise.id, searchText(exercise)]));

function filterExercises(filters: LibraryFilters, query: string, equipment: Set<Equipment>, favorites: number[]) {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const primaryFirst = (exercise: Exercise) => (filters.muscles.some((muscle) => exercise.primary.includes(muscle)) ? 0 : 1);
  return exercises.filter((exercise) =>
    words.every((word) => (searchIndex.get(exercise.id) ?? "").includes(word))
    && (filters.category === "all" || exercise.category === filters.category)
    && (!filters.muscles.length || filters.muscles.some((muscle) => exercise.primary.includes(muscle) || exercise.secondary.includes(muscle)))
    && (!filters.equipment || matchesEquipment(exercise, filters.equipment))
    && (!filters.level || exercise.level === filters.level)
    && (!filters.available || isAvailable(exercise, equipment))
    && (!filters.favorites || favorites.includes(exercise.id)))
    .sort((a, b) => primaryFirst(a) - primaryFirst(b));
}

const rise = (index: number) => ({ "--i": index }) as CSSProperties;

export function ExerciseLibrary() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // El estado local manda (varios toques seguidos no se pisan); la URL lo refleja para compartir y volver.
  const [filters, setFilters] = useState(() => parseFilters(new URLSearchParams(params.toString())));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [preference] = usePreference();
  const [favorites] = useFavorites();
  const equipment = useMemo(() => availableEquipment(preference), [preference]);
  const query = filters.query;

  useEffect(() => {
    const next = serializeFilters(filters);
    if (next === window.location.search.replace(/^\?/, "")) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  const update = (patch: Partial<LibraryFilters>) => setFilters((current) => ({ ...current, ...patch }));
  const changeQuery = (value: string) => update({ query: value });

  const toggleMuscle = (muscle: MuscleGroup) => setFilters((current) => ({
    ...current,
    muscles: current.muscles.includes(muscle) ? current.muscles.filter((item) => item !== muscle) : [...current.muscles, muscle],
  }));

  const clear = () => setFilters(parseFilters(new URLSearchParams()));

  const results = useMemo(() => filterExercises(filters, query, equipment, favorites), [equipment, favorites, filters, query]);
  // Para el estado vacío: cuántos aparecerían sin exigir el equipo propio.
  const withoutAvailability = useMemo(
    () => (filters.available && !results.length ? filterExercises({ ...filters, available: false }, query, equipment, favorites).length : 0),
    [equipment, favorites, filters, query, results.length],
  );

  const active = hasActiveFilters(filters);
  const grouped = !query.trim() && !filters.muscles.length && !filters.favorites;
  const groups = useMemo(() => (grouped ? groupExercises(results) : []), [grouped, results]);
  const sheetCount = sheetFilterCount(filters);
  const equipmentLabel = equipmentOptions.find((option) => option.value === filters.equipment)?.label;

  return (
    <div className="page lib-page">
      <header className="lib-head rise" style={rise(0)}>
        <p className="meta">Biblioteca · Casa y gimnasio</p>
        <h1>
          Ejercicios
          <span className="lib-head-count num">{exercises.length}</span>
        </h1>
        <p className="lib-head-line">Cada movimiento en tres pasos, con foto o ilustración.</p>
      </header>

      <div className="lib-tools rise" style={rise(1)}>
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

        <div className="scroll-x lib-chips" role="group" aria-label="Filtros">
          <button
            type="button"
            className={cn("chip lib-filter-button", sheetCount > 0 && "is-active")}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filtros
            {sheetCount > 0 && <><span className="lib-filter-count num" aria-hidden="true">{sheetCount}</span><span className="sr-only">, {sheetCount} activos</span></>}
          </button>
          {filters.level && <RemovableChip label={levelLabels[filters.level]} onRemove={() => update({ level: null })} />}
          {filters.muscles.map((muscle) => <RemovableChip key={muscle} label={muscleLabels[muscle]} onRemove={() => toggleMuscle(muscle)} />)}
          {equipmentLabel && <RemovableChip label={equipmentLabel} onRemove={() => update({ equipment: null })} />}
          <ToggleChip pressed={filters.favorites} onChange={(value) => update({ favorites: value })} icon={<Star size={15} aria-hidden="true" />}>
            Favoritos{favorites.length > 0 && <span className="lib-chip-count num">{favorites.length}</span>}
          </ToggleChip>
          <ToggleChip pressed={filters.available} onChange={(value) => update({ available: value })} icon={<Dumbbell size={15} aria-hidden="true" />}>
            Con mi equipo
          </ToggleChip>
          <span className="lib-chips-divider" aria-hidden="true" />
          {categoryOptions.filter((option) => option.value !== "all").map((option) => (
            <ToggleChip key={option.value} pressed={filters.category === option.value} onChange={(pressed) => update({ category: pressed ? option.value : "all" })}>
              {option.label}
            </ToggleChip>
          ))}
        </div>
      </div>

      {filters.muscles.length > 0 && <MuscleFocus muscles={filters.muscles} />}

      {!active && <LibraryFeatured />}

      <section className="lib-results" aria-label="Resultados">
        <p className="sr-only" aria-live="polite">{results.length} {results.length === 1 ? "ejercicio" : "ejercicios"}</p>
        {active && (
          <div className="lib-results-head">
            <h2>
              <span className="lib-results-num num">{results.length}</span>
              <span className="lib-results-of">de {exercises.length} ejercicios</span>
            </h2>
            <button type="button" className="link-button lib-clear" onClick={clear}>Limpiar filtros</button>
          </div>
        )}

        {!results.length ? (
          <LibraryEmpty filters={filters} favoritesCount={favorites.length} withoutAvailability={withoutAvailability} onUpdate={update} onClear={clear} />
        ) : grouped ? (
          groups.map((group, groupIndex) => (
            <section key={group.id} className="lib-group rise" style={rise(Math.min(groupIndex + 3, 6))} aria-labelledby={`lib-group-${group.id}`}>
              <header className="lib-group-head">
                <h2 id={`lib-group-${group.id}`}>{group.label}<span className="sr-only">, {group.items.length} ejercicios</span></h2>
                <span className="lib-group-count num" aria-hidden="true">{group.items.length}</span>
              </header>
              <div className="lib-grid">
                {group.items.map((exercise, index) => (
                  <LibraryCard key={exercise.id} exercise={exercise} available={isAvailable(exercise, equipment)} eager={groupIndex === 0 && index < 4} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="lib-grid">
            {results.map((exercise, index) => (
              <LibraryCard key={exercise.id} exercise={exercise} available={isAvailable(exercise, equipment)} eager={index < 4} />
            ))}
          </div>
        )}
      </section>

      <LibraryFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={update}
        resultCount={results.length}
        favoritesCount={favorites.length}
      />
    </div>
  );
}

function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" className="chip active lib-chip-remove" onClick={onRemove} aria-label={`Quitar filtro: ${label}`}>
      {label}
      <X size={14} aria-hidden="true" />
    </button>
  );
}

function MuscleFocus({ muscles }: { muscles: MuscleGroup[] }) {
  const names = muscles.map((muscle) => muscleLabels[muscle]);
  return (
    <aside className="lib-focus" aria-label="Músculos seleccionados">
      <MuscleMap primary={muscles} captions={false} className="lib-focus-map" label={`Seleccionado: ${names.join(", ")}`} />
      <div className="lib-focus-text">
        <p className="meta">Enfoque</p>
        <p className="lib-focus-title">{names.join(" · ")}</p>
        <p className="lib-focus-note">Incluye ejercicios donde trabaja como músculo principal o de apoyo.</p>
      </div>
    </aside>
  );
}

/** Estados vacíos que explican por qué no hay resultados y ofrecen la salida más útil. */
function LibraryEmpty({ filters, favoritesCount, withoutAvailability, onUpdate, onClear }: {
  filters: LibraryFilters;
  favoritesCount: number;
  withoutAvailability: number;
  onUpdate: (patch: Partial<LibraryFilters>) => void;
  onClear: () => void;
}) {
  const clearAction = <Button variant="secondary" size="s" onClick={onClear}>Limpiar filtros</Button>;
  if (filters.favorites && !favoritesCount) {
    return (
      <EmptyState icon={<Star size={20} />} title="Aún no tienes favoritos" action={<Button variant="secondary" size="s" onClick={() => onUpdate({ favorites: false })}>Ver todos los ejercicios</Button>}>
        Toca la estrella de un ejercicio para tenerlo siempre a mano.
      </EmptyState>
    );
  }
  if (filters.available && withoutAvailability > 0) {
    return (
      <EmptyState icon={<Lock size={20} />} title="Nada con tu equipo" action={<Button variant="secondary" size="s" onClick={() => onUpdate({ available: false })}>Ver con cualquier equipo</Button>}>
        {withoutAvailability === 1 ? "Hay 1 ejercicio que coincide, pero necesita otro equipo." : `Hay ${withoutAvailability} ejercicios que coinciden, pero necesitan otro equipo.`}
      </EmptyState>
    );
  }
  if (filters.favorites) {
    return (
      <EmptyState icon={<Star size={20} />} title="Ningún favorito coincide" action={clearAction}>
        Quita la búsqueda o algún filtro para ver tus {favoritesCount === 1 ? "favorito" : `${favoritesCount} favoritos`}.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon={<SearchX size={20} />} title="Nada coincide con tu búsqueda" action={clearAction}>
      Prueba con otro nombre o músculo, como «pecho» o «sentadilla», o quita algún filtro.
    </EmptyState>
  );
}
