"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, CopyX } from "lucide-react";
import { Button, Sheet } from "@/components/ui";
import { duplicateIds, sameFood, sameWorkout } from "@/lib/cloud/sync-plan";
import { amountLabel, mealSlots } from "@/lib/nutrition";
import { useFoodLog, useWorkouts } from "@/lib/store";
import { formatShortDate } from "@/lib/utils";

/** Registros repetidos (mismo contenido, otro id), p. ej. al unir dos equipos con la misma cuenta. */
export function useDuplicates() {
  const [log, setLog] = useFoodLog();
  const [workouts, setWorkouts] = useWorkouts();
  return useMemo(() => {
    const foodIds = new Set(duplicateIds(log, sameFood));
    const workoutIds = new Set(duplicateIds(workouts, sameWorkout));
    return {
      food: log.filter((entry) => foodIds.has(entry.id)),
      workouts: workouts.filter((workout) => workoutIds.has(workout.id)),
      count: foodIds.size + workoutIds.size,
      remove() {
        if (foodIds.size) setLog((current) => current.filter((entry) => !foodIds.has(entry.id)));
        if (workoutIds.size) setWorkouts((current) => current.filter((workout) => !workoutIds.has(workout.id)));
      },
    };
  }, [log, setLog, setWorkouts, workouts]);
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function duplicatesSummary(food: number, workouts: number) {
  return [food ? plural(food, "alimento", "alimentos") : "", workouts ? plural(workouts, "entrenamiento", "entrenamientos") : ""].filter(Boolean).join(" y ");
}

/** Fila en Ajustes → Tus datos (sólo si hay repetidos) y la hoja para revisarlos y quitarlos. */
export function DuplicatesRow({ onToast }: { onToast: (message: string) => void }) {
  const duplicates = useDuplicates();
  const [open, setOpen] = useState(false);
  if (!duplicates.count && !open) return null;
  const mealLabel = (meal: string) => mealSlots.find((slot) => slot.value === meal)?.label ?? "Comida";

  function remove() {
    const count = duplicates.count;
    duplicates.remove();
    setOpen(false);
    onToast(`${plural(count, "repetido quitado", "repetidos quitados")}`);
  }

  return (
    <>
      <button type="button" id="repetidos" className="list-row" onClick={() => setOpen(true)}>
        <span className="icon-tile accent" aria-hidden="true"><CopyX size={19} /></span>
        <span className="grow">
          <strong>Registros repetidos</strong>
          <small>{duplicatesSummary(duplicates.food.length, duplicates.workouts.length)} anotados dos veces.</small>
        </span>
        <ChevronRight size={18} className="subtle" aria-hidden="true" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} eyebrow="Tus datos" title="Registros repetidos">
        <div className="dup-sheet">
          <p className="muted">Mismo día, misma comida y misma cantidad. Pasa al unir tu cuenta en dos equipos donde anotaste lo mismo. Se conserva uno de cada uno.</p>
          {duplicates.food.length > 0 && (
            <section className="dup-group" aria-label="Alimentos repetidos">
              <h3 className="meta">Alimentos</h3>
              <ul className="dup-list">
                {duplicates.food.map((entry) => (
                  <li key={entry.id}><strong>{entry.name}</strong><small>{mealLabel(entry.meal)} · {formatShortDate(entry.date)} · {amountLabel(entry)}</small></li>
                ))}
              </ul>
            </section>
          )}
          {duplicates.workouts.length > 0 && (
            <section className="dup-group" aria-label="Entrenamientos repetidos">
              <h3 className="meta">Entrenamientos</h3>
              <ul className="dup-list">
                {duplicates.workouts.map((workout) => (
                  <li key={workout.id}><strong>{workout.name ?? "Entrenamiento"}</strong><small>{formatShortDate(workout.date)} · {Math.round(workout.durationMinutes)} min</small></li>
                ))}
              </ul>
            </section>
          )}
          <p className="dup-note">Si de verdad lo comiste dos veces, déjalo: puedes editar o quitar cada registro desde Nutrición.</p>
          <Button size="l" block onClick={remove} disabled={!duplicates.count}>Quitar {plural(duplicates.count, "repetido", "repetidos")}</Button>
          <Button variant="ghost" block onClick={() => setOpen(false)}>Ahora no</Button>
        </div>
      </Sheet>
    </>
  );
}

/** Aviso en la tarjeta de cuenta (Perfil) cuando hay repetidos. */
export function DuplicatesNotice() {
  const duplicates = useDuplicates();
  if (!duplicates.count) return null;
  return (
    <Link href="/ajustes#repetidos" className="cloud-dup">
      <CopyX size={16} aria-hidden="true" />
      <span className="grow">{duplicatesSummary(duplicates.food.length, duplicates.workouts.length)} repetidos al unir tus datos</span>
      <span className="cloud-dup-action">Revisar<ChevronRight size={15} aria-hidden="true" /></span>
    </Link>
  );
}
