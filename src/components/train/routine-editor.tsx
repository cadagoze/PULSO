"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { ExercisePicker } from "@/components/exercises/exercise-picker";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { Button, Sheet, Stepper } from "@/components/ui";
import { useSettings } from "@/lib/store";
import { exerciseById, recordFor } from "@/lib/training";
import { formatNumber, fromDisplayWeight, toDisplayWeight } from "@/lib/utils";
import { dayLetters, dayNames, loadStep, topLoad } from "@/components/train/shared";
import type { Routine } from "@/components/train/routines-section";
import type { Exercise, ExerciseRecord, SetRecord } from "@/types";

const restOptions = [30, 60, 90, 120, 180] as const;

function resizeSets(record: ExerciseRecord, count: number): SetRecord[] {
  const template = record.sets[0] ?? { value: 10, load: 0, done: false, kind: "normal" as const };
  return Array.from({ length: count }, (_, index) => ({ ...(record.sets[index] ?? template), done: false }));
}

/** Crear o editar una rutina: nombre, días, descanso y ejercicios con series, repeticiones, descanso y carga. */
export function RoutineEditor({ open, routine, isNew, onClose, onSave }: { open: boolean; routine: Routine; isNew: boolean; onClose: () => void; onSave: (routine: Routine) => void }) {
  const [settings] = useSettings();
  const [form, setForm] = useState<Routine>(routine);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const trimmed = form.name.trim();
  const errors = {
    name: !trimmed ? "Ponle un nombre a la rutina." : trimmed.length > 60 ? "Máximo 60 caracteres." : null,
    records: form.records.length ? null : "Agrega al menos un ejercicio.",
  };
  const valid = !errors.name && !errors.records;

  function updateRecord(index: number, update: (record: ExerciseRecord) => ExerciseRecord) {
    setForm((current) => ({ ...current, records: current.records.map((record, position) => (position === index ? update(record) : record)) }));
  }

  function move(index: number, delta: number) {
    setForm((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.records.length) return current;
      const records = [...current.records];
      [records[index], records[target]] = [records[target], records[index]];
      return { ...current, records };
    });
  }

  function toggleDay(day: number) {
    setForm((current) => ({
      ...current,
      days: current.days.includes(day) ? current.days.filter((item) => item !== day) : [...current.days, day].sort((a, b) => a - b),
    }));
  }

  function addExercises(selected: Exercise[]) {
    setForm((current) => ({ ...current, records: [...current.records, ...selected.map((exercise) => recordFor(exercise))] }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    onSave({ ...form, name: trimmed, updatedAt: new Date().toISOString() });
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title={isNew ? "Nueva rutina" : "Editar rutina"} eyebrow="Tus rutinas" className="train-editor">
        <form className="train-editor-form" onSubmit={submit} noValidate>
          <label className="field">
            Nombre
            <input
              value={form.name}
              maxLength={60}
              required
              placeholder="Ej.: Torso martes"
              aria-invalid={submitted && Boolean(errors.name)}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <span className="train-field-foot">
              {submitted && errors.name ? <span className="form-error">{errors.name}</span> : <span />}
              <span className="subtle num">{form.name.length}/60</span>
            </span>
          </label>

          <fieldset className="train-fieldset">
            <legend>Días que la entrenas</legend>
            <div className="train-day-toggles">
              {dayLetters.map((letter, index) => (
                <button key={index} type="button" aria-pressed={form.days.includes(index)} onClick={() => toggleDay(index)}>
                  <span aria-hidden="true">{letter}</span><span className="sr-only">{dayNames[index]}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="train-fieldset">
            <legend>Descanso entre series</legend>
            <div className="chips">
              {restOptions.map((seconds) => (
                <button key={seconds} type="button" className="chip num" aria-pressed={form.restSeconds === seconds} onClick={() => setForm((current) => ({ ...current, restSeconds: seconds }))}>
                  {seconds} s
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="train-fieldset">
            <legend>Ejercicios{form.records.length > 0 && <span className="num"> · {form.records.length}</span>}</legend>
            {form.records.length > 0 && (
              <ol className="train-edit-rows">
                {form.records.map((record, index) => {
                  const exercise = exerciseById(record.exerciseId);
                  if (!exercise) return null;
                  return (
                    <EditorRow
                      key={`${record.exerciseId}-${index}`}
                      exercise={exercise}
                      record={record}
                      unit={settings.unit}
                      first={index === 0}
                      last={index === form.records.length - 1}
                      onChange={(update) => updateRecord(index, update)}
                      onMove={(delta) => move(index, delta)}
                      onRemove={() => setForm((current) => ({ ...current, records: current.records.filter((_, position) => position !== index) }))}
                    />
                  );
                })}
              </ol>
            )}
            {submitted && errors.records && <p className="form-error">{errors.records}</p>}
            <Button variant="secondary" block onClick={() => setPickerOpen(true)}>
              <Plus size={18} />
              Agregar ejercicios
            </Button>
          </fieldset>

          <div className="train-editor-actions">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar rutina</Button>
          </div>
        </form>
      </Sheet>
      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addExercises}
        multiple
        exclude={form.records.map((record) => record.exerciseId)}
      />
    </>
  );
}

function EditorRow({ exercise, record, unit, first, last, onChange, onMove, onRemove }: {
  exercise: Exercise;
  record: ExerciseRecord;
  unit: "kg" | "lb";
  first: boolean;
  last: boolean;
  onChange: (update: (record: ExerciseRecord) => ExerciseRecord) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const seconds = record.unit === "seconds";
  const value = record.sets[0]?.value ?? exercise.range[0];
  const load = toDisplayWeight(topLoad(record), unit);
  return (
    <li className="train-edit-row">
      <div className="train-edit-head">
        <ExerciseVisual exercise={exercise} size="thumb" />
        <div className="grow">
          <strong>{exercise.name}</strong>
          <small>{exercise.muscle}</small>
        </div>
        <div className="train-edit-order">
          <button type="button" className="btn-icon small" disabled={first} onClick={() => onMove(-1)} aria-label={`Subir ${exercise.name}`}>
            <ArrowUp size={16} />
          </button>
          <button type="button" className="btn-icon small" disabled={last} onClick={() => onMove(1)} aria-label={`Bajar ${exercise.name}`}>
            <ArrowDown size={16} />
          </button>
          <button type="button" className="btn-icon small train-danger" onClick={onRemove} aria-label={`Quitar ${exercise.name}`}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="train-edit-controls">
        <div className="train-edit-control">
          <span>Series</span>
          <Stepper
            label={`series de ${exercise.name}`}
            value={record.sets.length}
            min={1}
            max={10}
            onChange={(count) => onChange((current) => ({ ...current, sets: resizeSets(current, count) }))}
          />
        </div>
        <div className="train-edit-control">
          <span>{seconds ? "Segundos" : "Repeticiones"}</span>
          <Stepper
            label={`${seconds ? "segundos" : "repeticiones"} de ${exercise.name}`}
            value={value}
            min={seconds ? 5 : 1}
            max={seconds ? 600 : 100}
            step={seconds ? 5 : 1}
            onChange={(next) => onChange((current) => ({ ...current, sets: current.sets.map((set) => ({ ...set, value: next })) }))}
          />
        </div>
        {exercise.increment > 0 && (
          <div className="train-edit-control">
            <span>Carga</span>
            <Stepper
              label={`carga de ${exercise.name}`}
              value={load}
              min={0}
              max={unit === "lb" ? 660 : 300}
              step={loadStep(exercise, unit)}
              format={(shown) => (shown ? `${formatNumber(shown)} ${unit}` : "—")}
              onChange={(next) => onChange((current) => ({ ...current, sets: current.sets.map((set) => ({ ...set, load: fromDisplayWeight(next, unit) })) }))}
            />
          </div>
        )}
        <div className="train-edit-control">
          <span>Descanso</span>
          <Stepper
            label={`descanso de ${exercise.name}`}
            value={record.restSeconds ?? 0}
            min={0}
            max={300}
            step={15}
            format={(rest) => (rest ? `${rest} s` : "Base")}
            onChange={(rest) => onChange((current) => ({ ...current, restSeconds: rest || undefined }))}
          />
        </div>
      </div>
    </li>
  );
}
