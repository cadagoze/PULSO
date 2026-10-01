"use client";

import { useNow } from "@/lib/use-now";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Building2, Home, Info, Plus, RefreshCw, Save, Shuffle, Sparkles, Trash2 } from "lucide-react";
import { equipmentOptions } from "@/data/mock-data";
import { muscleLabels } from "@/data/catalog";
import { ExercisePicker } from "@/components/exercises/exercise-picker";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { Switch } from "@/components/ui";
import { MuscleMap } from "@/components/ui/muscle-map";
import { muscleRecovery } from "@/lib/analytics";
import { durationOptions, estimateMinutes, focusLabels, generateWorkout, goalFromProfile, levelFromActivities, suggestedFocus } from "@/lib/generator";
import type { WorkoutFocus } from "@/lib/generator";
import { progressedSets } from "@/lib/progression";
import { useStartWorkout } from "@/lib/session";
import { usePreference, useProfile, useReadiness, useRoutines, useSettings, useWorkouts } from "@/lib/store";
import { exerciseById, lastRecordFor, newId } from "@/lib/training";
import { localDateKey, localDaySeed, toDisplayWeight } from "@/lib/utils";
import { restText, targetLabel, topLoad, useToast } from "@/components/train/shared";
import type { BodyArea, Exercise, ExerciseRecord, MuscleGroup, ReadinessEntry, TrainingEquipment, TrainingLocation, WorkoutEntry } from "@/types";

const HOUR = 3_600_000;
const bodyAreas: BodyArea[] = ["knees", "back", "shoulders"];

const readinessText: Record<ReadinessEntry["recommendation"], string> = {
  planned: "Listo para lo planificado",
  short: "Mejor una sesión corta",
  recovery: "Día para recuperar",
};

function recordForExercise(exercise: Exercise, workouts: WorkoutEntry[], sets = exercise.sets, restSeconds?: number): ExerciseRecord {
  return {
    exerciseId: exercise.id,
    unit: exercise.unit,
    sets: progressedSets(exercise, sets, lastRecordFor(workouts, exercise.id)),
    ...(restSeconds ? { restSeconds } : {}),
  };
}

export function TodayBuilder() {
  const now = useNow();
  const [profile] = useProfile();
  const [workouts] = useWorkouts();
  const [readinessEntries] = useReadiness();
  const [preference, setPreference] = usePreference();
  const [settings] = useSettings();
  const [, setRoutines] = useRoutines();
  const start = useStartWorkout();
  const toast = useToast();

  const [minutesChoice, setMinutesChoice] = useState<number | null>(null);
  const [focusChoice, setFocusChoice] = useState<WorkoutFocus | null>(null);
  const [variant, setVariant] = useState(0);
  const [includeWarmup, setIncludeWarmup] = useState(true);
  const [picker, setPicker] = useState<{ mode: "add" } | { mode: "replace"; index: number } | null>(null);

  const hour = Math.floor(now / HOUR);
  const dayNumber = localDaySeed(now);
  const todayKey = now ? localDateKey(new Date(now)) : "";
  const readiness = readinessEntries.find((entry) => entry.date === todayKey);
  const recovery = useMemo(() => (hour ? muscleRecovery(workouts, hour * HOUR) : undefined), [hour, workouts]);
  const suggested = suggestedFocus(recovery, readiness?.recommendation);
  const focus = focusChoice ?? suggested;
  const minutes = minutesChoice ?? profile?.recommendation.sessionMinutes ?? 30;
  const limitations = useMemo(
    () => (profile?.limitations ?? []).filter((item): item is BodyArea => bodyAreas.some((area) => area === item)),
    [profile?.limitations],
  );

  const plan = useMemo(() => {
    if (!dayNumber) return null;
    return generateWorkout({
      preference,
      minutes,
      focus,
      goal: goalFromProfile(profile?.goals),
      level: levelFromActivities(profile?.activities),
      limitations,
      readiness: readiness?.recommendation,
      recovery,
      workouts,
      seed: dayNumber + variant,
    });
  }, [dayNumber, focus, limitations, minutes, preference, profile?.activities, profile?.goals, readiness?.recommendation, recovery, variant, workouts]);

  // La lista editable se reinicia cuando cambian las entradas del generador.
  const planKey = [preference.location, preference.equipment.join(","), minutes, focus, variant, readiness?.recommendation ?? "", workouts.length, dayNumber].join("|");
  const [edits, setEdits] = useState<{ key: string; records: ExerciseRecord[] } | null>(null);
  const records = edits && edits.key === planKey ? edits.records : plan?.records ?? [];

  function editRecords(update: (current: ExerciseRecord[]) => ExerciseRecord[]) {
    setEdits({ key: planKey, records: update(records) });
  }

  const warmupRecords: ExerciseRecord[] = includeWarmup && plan
    ? plan.warmup.map((exercise) => ({
      exerciseId: exercise.id,
      unit: "seconds",
      sets: [{ value: 30, load: 0, done: false, kind: "warmup" }],
      restSeconds: 15,
    }))
    : [];
  const fullRecords = [...warmupRecords, ...records];
  const restSeconds = plan?.restSeconds ?? settings.defaultRest;
  const estimated = estimateMinutes(fullRecords, restSeconds);
  const name = plan ? `${focusLabels[focus]} · ${minutes} min` : "Entrenamiento de hoy";

  const planExercises = records.map((record) => exerciseById(record.exerciseId)).filter((item): item is Exercise => Boolean(item));
  const primary = [...new Set(planExercises.flatMap((exercise) => exercise.primary))];
  const secondary = [...new Set(planExercises.flatMap((exercise) => exercise.secondary))].filter((muscle: MuscleGroup) => !primary.includes(muscle));

  function setLocation(location: TrainingLocation) {
    setPreference((current) => ({ location, equipment: current.equipment }));
  }

  function toggleEquipment(item: TrainingEquipment) {
    setPreference((current) => ({
      ...current,
      equipment: current.equipment.includes(item) ? current.equipment.filter((value) => value !== item) : [...current.equipment, item],
    }));
  }

  function saveAsRoutine() {
    setRoutines((current) => [
      ...current,
      { id: newId("rutina"), name, days: [], restSeconds, records: fullRecords, updatedAt: new Date().toISOString() },
    ]);
    toast.show("Guardada en tus rutinas");
  }

  function handlePick(selected: Exercise[]) {
    if (!picker) return;
    if (picker.mode === "replace") {
      const [exercise] = selected;
      if (!exercise) return;
      editRecords((current) => current.map((record, index) => index === picker.index
        ? recordForExercise(exercise, workouts, record.sets.length, record.restSeconds)
        : record));
      return;
    }
    editRecords((current) => [...current, ...selected.map((exercise) => recordForExercise(exercise, workouts))]);
  }

  const replacing = picker?.mode === "replace" ? exerciseById(records[picker.index]?.exerciseId ?? -1) : undefined;

  return (
    <div className="train-today">
      <section className="card train-controls" aria-label="Ajustes de la sesión">
        <div className="train-control">
          <span className="train-label">Lugar</span>
          <div className="train-location" role="group" aria-label="Lugar de entrenamiento">
            <button type="button" aria-pressed={preference.location === "home"} onClick={() => setLocation("home")}>
              <Home size={18} />
              Casa
            </button>
            <button type="button" aria-pressed={preference.location === "gym"} onClick={() => setLocation("gym")}>
              <Building2 size={18} />
              Gimnasio
            </button>
          </div>
        </div>

        {preference.location === "home" && (
          <div className="train-control">
            <span className="train-label">
              Equipamiento
              <small>{preference.equipment.length ? `${preference.equipment.length} seleccionado${preference.equipment.length > 1 ? "s" : ""}` : "Peso corporal"}</small>
            </span>
            <div className="chips">
              {equipmentOptions.map((option) => (
                <button key={option.value} type="button" className="chip" aria-pressed={preference.equipment.includes(option.value)} onClick={() => toggleEquipment(option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="train-control">
          <span className="train-label">Duración</span>
          <div className="chips">
            {durationOptions.map((option) => (
              <button key={option} type="button" className="chip num" aria-pressed={minutes === option} onClick={() => setMinutesChoice(option)}>
                {option} min
              </button>
            ))}
          </div>
        </div>

        <div className="train-control">
          <span className="train-label">Enfoque</span>
          <div className="chips">
            {(Object.keys(focusLabels) as WorkoutFocus[]).map((option) => (
              <button key={option} type="button" className="chip" aria-pressed={focus === option} onClick={() => setFocusChoice(option)}>
                {focusLabels[option]}
                {option === suggested && now !== 0 && <span className="train-suggested">Sugerido</span>}
              </button>
            ))}
          </div>
        </div>

        <ReadinessLine entry={readiness} ready={now !== 0} />
      </section>

      {!plan ? (
        <div className="card train-placeholder" aria-busy="true">Preparando tu sesión…</div>
      ) : (
        <div className="train-plan-layout">
          <section className="train-plan" aria-label="Plan de hoy">
            <header className="train-plan-head">
              <div>
                <p className="eyebrow">Tu sesión de hoy</p>
                <h2>{name}</h2>
                <p className="muted num">
                  {records.length} ejercicios · ~{estimated} min · descanso base {restText(restSeconds)}
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setVariant((value) => value + 1)}>
                <Shuffle size={16} />
                Otra variante
              </button>
            </header>

            {plan.notes.length > 0 && (
              <div className="notice train-notes">
                <Info size={18} />
                <div className="stack-s">
                  {plan.notes.map((note) => <p key={note}>{note}</p>)}
                </div>
              </div>
            )}

            {plan.warmup.length > 0 && (
              <div className="train-warmup">
                <div className="spread">
                  <div>
                    <strong>Calentamiento sugerido</strong>
                    <small className="muted">{plan.warmup.length} × 30 s antes de empezar</small>
                  </div>
                  <Switch checked={includeWarmup} onChange={setIncludeWarmup} label="Incluir calentamiento" />
                </div>
                <div className="chips">
                  {plan.warmup.map((exercise) => (
                    <span key={exercise.id} className={includeWarmup ? "train-warmup-chip on" : "train-warmup-chip"}>{exercise.name}</span>
                  ))}
                </div>
              </div>
            )}

            <ol className="train-rows">
              {records.map((record, index) => {
                const exercise = exerciseById(record.exerciseId);
                if (!exercise) return null;
                return (
                  <PlanRow
                    key={`${record.exerciseId}-${index}`}
                    index={index}
                    exercise={exercise}
                    record={record}
                    restSeconds={record.restSeconds ?? restSeconds}
                    unit={settings.unit}
                    onSwap={() => setPicker({ mode: "replace", index })}
                    onRemove={() => editRecords((current) => current.filter((_, position) => position !== index))}
                  />
                );
              })}
            </ol>
            {!records.length && <p className="empty">Sin ejercicios. Agrega alguno o pide otra variante.</p>}

            <div className="train-plan-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setPicker({ mode: "add" })}>
                <Plus size={18} />
                Agregar ejercicio
              </button>
              <button type="button" className="btn btn-ghost" onClick={saveAsRoutine} disabled={!records.length}>
                <Save size={18} />
                Guardar como rutina
              </button>
              {edits?.key === planKey && (
                <button type="button" className="btn btn-ghost" onClick={() => setEdits(null)}>
                  <RefreshCw size={16} />
                  Deshacer cambios
                </button>
              )}
            </div>
          </section>

          <aside className="card train-map-card" aria-label="Músculos de la sesión">
            <div className="train-map-copy">
              <p className="eyebrow">Músculos de hoy</p>
              <div className="chips">
                {primary.map((muscle) => <span key={muscle} className="badge">{muscleLabels[muscle]}</span>)}
                {secondary.map((muscle) => <span key={muscle} className="badge badge-muted">{muscleLabels[muscle]}</span>)}
              </div>
            </div>
            <MuscleMap primary={primary} secondary={secondary} label="Músculos que trabaja la sesión" />
            <div className="muscle-legend">
              <span><i className="train-key-primary" />Principal</span>
              <span><i className="train-key-secondary" />Secundario</span>
            </div>
          </aside>
        </div>
      )}

      {plan && (
        <div className="train-sticky">
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!records.length}
            onClick={() => start({ name, records: fullRecords, restSeconds, source: { type: "generated" } })}
          >
            Comenzar · ~{estimated} min
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      <ExercisePicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        onSelect={handlePick}
        replacing={replacing}
        multiple={picker?.mode === "add"}
        exclude={records.map((record) => record.exerciseId)}
      />
      {toast.node}
    </div>
  );
}

function ReadinessLine({ entry, ready }: { entry?: ReadinessEntry; ready: boolean }) {
  if (!ready) return <div className="train-readiness" aria-hidden="true" />;
  if (!entry) {
    return (
      <Link href="/" className="train-readiness missing">
        <Sparkles size={18} />
        <span className="grow">Haz tu chequeo de hoy en Hoy</span>
        <ArrowRight size={16} />
      </Link>
    );
  }
  return (
    <div className="train-readiness" data-tone={entry.recommendation}>
      <span className="train-readiness-score num">{entry.score}</span>
      <span className="grow">
        <strong>Disposición de hoy</strong>
        <small>{readinessText[entry.recommendation]}</small>
      </span>
    </div>
  );
}

function PlanRow({ index, exercise, record, restSeconds, unit, onSwap, onRemove }: {
  index: number;
  exercise: Exercise;
  record: ExerciseRecord;
  restSeconds: number;
  unit: "kg" | "lb";
  onSwap: () => void;
  onRemove: () => void;
}) {
  const load = topLoad(record);
  return (
    <li className="train-row">
      <span className="train-row-index num">{String(index + 1).padStart(2, "0")}</span>
      <ExerciseVisual exercise={exercise} size="thumb" />
      <div className="train-row-body">
        <strong>{exercise.name}</strong>
        <small>{exercise.muscle}</small>
        <div className="train-row-meta num">
          <span className="train-target">{targetLabel(exercise, record.sets.length)}</span>
          {load > 0 && <span>{toDisplayWeight(load, unit)} {unit}</span>}
          <span>{restText(restSeconds)} desc.</span>
        </div>
      </div>
      <div className="train-row-actions">
        <button type="button" className="btn-icon small" onClick={onSwap} aria-label={`Cambiar ${exercise.name}`}>
          <RefreshCw size={16} />
        </button>
        <button type="button" className="btn-icon small" onClick={onRemove} aria-label={`Quitar ${exercise.name}`}>
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}
