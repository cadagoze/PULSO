"use client";

import { useState } from "react";
import { Copy, Dumbbell, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { estimateMinutes } from "@/lib/generator";
import { useStartWorkout } from "@/lib/session";
import { useRoutines, useSettings } from "@/lib/store";
import { exerciseById, newId } from "@/lib/training";
import { dayLetters, dayNames, useToast } from "@/components/train/shared";
import { RoutineEditor } from "@/components/train/routine-editor";
import type { TrainingRoutine } from "@/types";

type Routine = TrainingRoutine & { id: string };

export function RoutinesTab() {
  const [routines, setRoutines] = useRoutines();
  const [settings] = useSettings();
  const start = useStartWorkout();
  const toast = useToast();
  const [editing, setEditing] = useState<Routine | null>(null);

  function createRoutine() {
    setEditing({ id: newId("rutina"), name: "", days: [], restSeconds: settings.defaultRest, records: [] });
  }

  function save(routine: Routine) {
    setRoutines((current) => current.some((item) => item.id === routine.id)
      ? current.map((item) => (item.id === routine.id ? routine : item))
      : [...current, routine]);
    setEditing(null);
    toast.show("Rutina guardada");
  }

  function duplicate(routine: Routine) {
    setRoutines((current) => {
      const index = current.findIndex((item) => item.id === routine.id);
      const copy = { ...routine, id: newId("rutina"), name: `${routine.name} (copia)`.slice(0, 60), updatedAt: new Date().toISOString() };
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
    toast.show("Rutina duplicada");
  }

  function remove(routine: Routine) {
    if (!window.confirm(`¿Eliminar "${routine.name}"? Esta acción no se puede deshacer.`)) return;
    setRoutines((current) => current.filter((item) => item.id !== routine.id));
    toast.show("Rutina eliminada");
  }

  return (
    <div className="train-routines">
      <div className="spread">
        <p className="muted">
          {routines.length ? `${routines.length} ${routines.length === 1 ? "rutina guardada" : "rutinas guardadas"}` : "Aún no tienes rutinas"}
        </p>
        <button type="button" className="btn btn-dark btn-small" onClick={createRoutine}>
          <Plus size={16} />
          Nueva rutina
        </button>
      </div>

      {routines.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={20} />}
          title="Arma tu primera rutina"
          action={(
            <button type="button" className="btn btn-primary" onClick={createRoutine}>
              <Plus size={18} />
              Nueva rutina
            </button>
          )}
        >
          Elige ejercicios, series y días. También puedes guardar la sesión de “Para hoy” como rutina.
        </EmptyState>
      ) : (
        <div className="train-routine-grid">
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onStart={() => start({ name: routine.name, records: routine.records, restSeconds: routine.restSeconds, source: { type: "routine", routineId: routine.id } })}
              onEdit={() => setEditing(routine)}
              onDuplicate={() => duplicate(routine)}
              onRemove={() => remove(routine)}
            />
          ))}
        </div>
      )}

      {editing && (
        <RoutineEditor
          key={editing.id}
          routine={editing}
          isNew={!routines.some((item) => item.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {toast.node}
    </div>
  );
}

function RoutineCard({ routine, onStart, onEdit, onDuplicate, onRemove }: {
  routine: Routine;
  onStart: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const names = routine.records
    .map((record) => exerciseById(record.exerciseId)?.name)
    .filter((name): name is string => Boolean(name));
  const minutes = routine.records.length ? estimateMinutes(routine.records, routine.restSeconds) : 0;
  return (
    <article className="card train-routine">
      <header className="train-routine-head">
        <h3>{routine.name}</h3>
        <p className="muted num">
          {routine.records.length} {routine.records.length === 1 ? "ejercicio" : "ejercicios"}
          {minutes > 0 && ` · ~${minutes} min`}
        </p>
      </header>
      <ul className="train-days" aria-label="Días de la rutina">
        {dayLetters.map((letter, index) => {
          const active = routine.days.includes(index);
          return (
            <li key={index} className={active ? "on" : undefined} title={dayNames[index]}>
              <span aria-hidden="true">{letter}</span>
              <span className="sr-only">{dayNames[index]}{active ? ", entrena" : ""}</span>
            </li>
          );
        })}
      </ul>
      {names.length > 0 && (
        <p className="train-routine-list">
          {names.slice(0, 3).join(" · ")}
          {names.length > 3 && <span className="subtle"> +{names.length - 3}</span>}
        </p>
      )}
      <div className="train-routine-actions">
        <button type="button" className="btn btn-primary btn-small" onClick={onStart} disabled={!routine.records.length}>
          <Play size={15} />
          Comenzar
        </button>
        <button type="button" className="btn-icon" onClick={onEdit} aria-label={`Editar ${routine.name}`}>
          <Pencil size={16} />
        </button>
        <button type="button" className="btn-icon" onClick={onDuplicate} aria-label={`Duplicar ${routine.name}`}>
          <Copy size={16} />
        </button>
        <button type="button" className="btn-icon train-danger" onClick={onRemove} aria-label={`Eliminar ${routine.name}`}>
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
