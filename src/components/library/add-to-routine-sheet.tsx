"use client";

import Link from "@/components/ui/app-link";
import { Check, Plus } from "lucide-react";
import { Sheet } from "@/components/ui";
import { recordFor } from "@/lib/training";
import { useRoutines } from "@/lib/store";
import type { Exercise } from "@/types";

const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function AddToRoutineSheet({ exercise, open, onClose, onAdded }: { exercise: Exercise; open: boolean; onClose: () => void; onAdded: (routineName: string) => void }) {
  const [routines, setRoutines] = useRoutines();

  const add = (routineId: string, name: string) => {
    const updatedAt = new Date().toISOString();
    setRoutines((current) => current.map((routine) => routine.id !== routineId || routine.records.some((record) => record.exerciseId === exercise.id)
      ? routine
      : { ...routine, records: [...routine.records, recordFor(exercise)], updatedAt }));
    onAdded(name);
  };

  return (
    <Sheet open={open} onClose={onClose} eyebrow={exercise.name} title="Agregar a rutina" className="lib-routine-sheet">
      {routines.length ? (
        <ul className="list lib-routines">
          {routines.map((routine) => {
            const included = routine.records.some((record) => record.exerciseId === exercise.id);
            return (
              <li key={routine.id}>
                <button type="button" className="list-row lib-routine" disabled={included} onClick={() => add(routine.id, routine.name)}>
                  <span className="grow">
                    <strong>{routine.name}</strong>
                    <small>
                      <span className="num">{routine.records.length}</span> {routine.records.length === 1 ? "ejercicio" : "ejercicios"}
                      {routine.days.length ? ` · ${routine.days.map((day) => dayNames[day] ?? "").join(" ")}` : ""}
                    </small>
                  </span>
                  {included ? (
                    <span className="badge badge-muted"><Check size={12} aria-hidden="true" />Ya está</span>
                  ) : (
                    <span className="lib-routine-add" aria-hidden="true"><Plus size={18} /></span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="lib-routines-empty">Aún no tienes rutinas guardadas. <Link href="/entrenar" className="link-button">Crea una en Entrenar</Link></p>
      )}
      <p className="lib-routines-note">Se agrega con <span className="num">{exercise.sets}</span> series al final de la rutina. Puedes ajustarla en Entrenar.</p>
    </Sheet>
  );
}
