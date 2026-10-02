"use client";

import type { CSSProperties } from "react";
import { Copy, Dumbbell, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Button, EmptyState, MetaLine } from "@/components/ui";
import { estimateMinutes } from "@/lib/generator";
import { useStartWorkout } from "@/lib/session";
import { useRoutines } from "@/lib/store";
import { exerciseById, newId } from "@/lib/training";
import { cn } from "@/lib/utils";
import { dayLetters, dayNames } from "@/components/train/shared";
import type { TrainingRoutine } from "@/types";

export type Routine = TrainingRoutine & { id: string };

/** Rutinas guardadas en tarjetas claras: días planificados, comenzar, editar, duplicar y eliminar. */
export function RoutinesSection({ onCreate, onEdit, notify }: { onCreate: () => void; onEdit: (routine: Routine) => void; notify: (message: string) => void }) {
  const [routines, setRoutines] = useRoutines();
  const start = useStartWorkout();

  function duplicate(routine: Routine) {
    setRoutines((current) => {
      const index = current.findIndex((item) => item.id === routine.id);
      const copy = { ...routine, id: newId("rutina"), name: `${routine.name} (copia)`.slice(0, 60), updatedAt: new Date().toISOString() };
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
    notify("Rutina duplicada");
  }

  function remove(routine: Routine) {
    if (!window.confirm(`¿Eliminar "${routine.name}"? Esta acción no se puede deshacer.`)) return;
    setRoutines((current) => current.filter((item) => item.id !== routine.id));
    notify("Rutina eliminada");
  }

  return (
    <section id="rutinas" className="section train-section" aria-labelledby="train-routines-title">
      <div className="section-head">
        <h2 id="train-routines-title">Tus rutinas</h2>
        {routines.length > 0 && (
          <Button variant="secondary" size="s" onClick={onCreate}>
            <Plus size={16} />
            Nueva
          </Button>
        )}
      </div>
      {routines.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={20} />}
          title="Arma tu primera rutina"
          action={(
            <Button variant="dark" onClick={onCreate}>
              <Plus size={18} />
              Nueva rutina
            </Button>
          )}
        >
          Elige ejercicios, series y días. También puedes guardar tu rutina de hoy desde «Ver y editar».
        </EmptyState>
      ) : (
        <div className="train-routines">
          {routines.map((routine, index) => (
            <RoutineItem
              key={routine.id}
              routine={routine}
              index={index}
              onStart={() => start({ name: routine.name, records: routine.records, restSeconds: routine.restSeconds, source: { type: "routine", routineId: routine.id } })}
              onEdit={() => onEdit(routine)}
              onDuplicate={() => duplicate(routine)}
              onRemove={() => remove(routine)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RoutineItem({ routine, index, onStart, onEdit, onDuplicate, onRemove }: {
  routine: Routine;
  index: number;
  onStart: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const names = routine.records
    .map((record) => exerciseById(record.exerciseId)?.name)
    .filter((name): name is string => Boolean(name));
  const count = routine.records.length;
  const minutes = count ? estimateMinutes(routine.records, routine.restSeconds) : 0;
  return (
    <article className="card train-routine rise" style={{ "--i": index } as CSSProperties} aria-labelledby={`train-routine-${routine.id}`}>
      <div className="train-routine-head">
        <h3 id={`train-routine-${routine.id}`} className="train-routine-name">{routine.name}</h3>
        <MetaLine items={[<><b className="num">{count}</b> {count === 1 ? "ejercicio" : "ejercicios"}</>, minutes > 0 ? <><b className="num">{minutes}</b> min</> : null]} />
      </div>
      <ol className="train-days" aria-label="Días planificados">
        {dayLetters.map((letter, day) => {
          const on = routine.days.includes(day);
          return (
            <li key={day} className={cn(on && "on")} title={dayNames[day]}>
              <span aria-hidden="true">{letter}</span>
              <span className="sr-only">{dayNames[day]}{on ? ", planificado" : ""}</span>
            </li>
          );
        })}
      </ol>
      {names.length > 0 && (
        <p className="train-routine-list">
          {names.slice(0, 3).join(" · ")}
          {names.length > 3 && <span className="subtle"> +{names.length - 3}</span>}
        </p>
      )}
      <div className="train-routine-actions">
        <Button variant="dark" size="s" onClick={onStart} disabled={!count}>
          <Play size={15} fill="currentColor" />
          Comenzar
        </Button>
        <span className="grow" />
        <button type="button" className="btn-icon small train-row-action" onClick={onEdit} aria-label={`Editar ${routine.name}`}>
          <Pencil size={16} />
        </button>
        <button type="button" className="btn-icon small train-row-action" onClick={onDuplicate} aria-label={`Duplicar ${routine.name}`}>
          <Copy size={16} />
        </button>
        <button type="button" className="btn-icon small train-row-action train-danger" onClick={onRemove} aria-label={`Eliminar ${routine.name}`}>
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
