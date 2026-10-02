"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Info, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { muscleLabels } from "@/data/catalog";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { ExercisePicker } from "@/components/exercises/exercise-picker";
import { Button, Switch } from "@/components/ui";
import { MuscleMap } from "@/components/ui/muscle-map";
import { useSettings } from "@/lib/store";
import { exerciseById } from "@/lib/training";
import { cn, formatNumber, toDisplayWeight } from "@/lib/utils";
import { restText, targetLabel, topLoad } from "@/components/train/shared";
import { LoadSheet } from "@/components/train/today-sheets";
import { recordForExercise } from "@/components/train/today-plan";
import type { ActiveProgram, TodayPlan, TodaySource } from "@/components/train/today-plan";
import type { Exercise, ExerciseRecord, MuscleGroup } from "@/types";

type Picker = { mode: "add" } | { mode: "replace"; index: number };

/**
 * Lista de ejercicios de la rutina de hoy (se despliega desde la tarjeta en móvil; siempre visible en escritorio).
 * A tu medida: calentamiento, cambiar, quitar, agregar, ajustar la carga y guardar como rutina.
 * Programa: sólo lectura.
 */
export function TodayExercises({ source, today, active, visible, onSaveRoutine }: { source: TodaySource; today: TodayPlan; active: ActiveProgram | null; visible: boolean; onSaveRoutine: () => void }) {
  if (source === "draft") return null;
  if (source === "program") return active?.next ? <ProgramExercises active={active} visible={visible} /> : null;
  if (!today.ready) return null;
  return <CustomExercises today={today} visible={visible} onSaveRoutine={onSaveRoutine} />;
}

function CustomExercises({ today, visible, onSaveRoutine }: { today: TodayPlan; visible: boolean; onSaveRoutine: () => void }) {
  const [settings] = useSettings();
  const unit = settings.unit;
  const [picker, setPicker] = useState<Picker | null>(null);
  const [load, setLoad] = useState<{ index: number; open: boolean } | null>(null);
  const [bumped, setBumped] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
  }, []);

  const records = today.records;
  const replacing = picker?.mode === "replace" ? exerciseById(records[picker.index]?.exerciseId ?? -1) : undefined;
  const loadRecord = load ? records[load.index] : undefined;
  const loadExercise = loadRecord ? exerciseById(loadRecord.exerciseId) : undefined;

  function handlePick(selected: Exercise[]) {
    if (!picker) return;
    setBumped(null);
    if (picker.mode === "replace") {
      const [exercise] = selected;
      if (!exercise) return;
      today.editRecords((current) => current.map((record, index) => index === picker.index
        ? recordForExercise(exercise, today.workouts, record.sets.length, record.restSeconds)
        : record));
      return;
    }
    today.editRecords((current) => [...current, ...selected.map((exercise) => recordForExercise(exercise, today.workouts))]);
  }

  function changeLoad(kg: number) {
    if (!load) return;
    today.editRecords((current) => current.map((record, index) => index === load.index ? { ...record, sets: record.sets.map((set) => ({ ...set, load: kg })) } : record));
    setBumped(load.index);
  }

  function save() {
    onSaveRoutine();
    setSaved(true);
    if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 2400);
  }

  return (
    <>
      <section id="train-exercises" className="train-ex" hidden={!visible} aria-labelledby="train-ex-title">
        <div className="train-ex-head">
          <h2 id="train-ex-title" className="meta">Ejercicios de hoy · <span className="num">{records.length}</span></h2>
          {today.edited && (
            <button type="button" className="link-button" onClick={today.resetEdits}>
              <RefreshCw size={14} aria-hidden="true" />
              Deshacer cambios
            </button>
          )}
        </div>

        {today.warmup.length > 0 && (
          <div className={cn("train-warmup", today.includeWarmup && "on")}>
            <div className="train-warmup-text">
              <strong>Calentamiento</strong>
              <small><span className="num">{today.warmup.length} × 30 s</span> · {today.warmup.map((exercise) => exercise.name).join(" · ")}</small>
            </div>
            <Switch checked={today.includeWarmup} onChange={today.setIncludeWarmup} label="Incluir calentamiento" />
          </div>
        )}

        {records.length ? (
          <ol className="train-ex-list">
            {records.map((record, index) => {
              const exercise = exerciseById(record.exerciseId);
              if (!exercise) return null;
              const kg = topLoad(record);
              return (
                <li key={`${record.exerciseId}-${index}`}>
                  <ExerciseCard
                    exercise={exercise}
                    index={index}
                    meta={(
                      <span className="train-ex-meta">
                        <span className="num train-ex-target">{targetLabel(exercise, record.sets.length)}</span>
                        {exercise.increment > 0 && (
                          <button
                            key={kg}
                            type="button"
                            className={cn("train-load", !kg && "is-empty", bumped === index && "is-bumped")}
                            onClick={() => setLoad({ index, open: true })}
                            aria-label={kg ? `Carga de ${exercise.name}: ${formatNumber(toDisplayWeight(kg, unit))} ${unit}. Cambiar` : `Elegir carga de ${exercise.name}`}
                          >
                            {kg ? <span className="num">{formatNumber(toDisplayWeight(kg, unit))} {unit}</span> : <><Plus size={12} strokeWidth={2.6} aria-hidden="true" />Carga</>}
                          </button>
                        )}
                        <span className="num">{restText(record.restSeconds ?? today.restSeconds)} desc.</span>
                      </span>
                    )}
                    trailing={(
                      <>
                        <button type="button" className="btn-icon small train-row-action" onClick={() => setPicker({ mode: "replace", index })} aria-label={`Cambiar ${exercise.name}`}>
                          <RefreshCw size={16} />
                        </button>
                        <button type="button" className="btn-icon small train-row-action" onClick={() => { setBumped(null); today.editRecords((current) => current.filter((_, position) => position !== index)); }} aria-label={`Quitar ${exercise.name}`}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  />
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="train-ex-empty">Sin ejercicios. Agrega alguno o pide otra variante.</p>
        )}

        <div className="train-ex-actions">
          <Button variant="secondary" onClick={() => setPicker({ mode: "add" })}>
            <Plus size={18} />
            Agregar ejercicio
          </Button>
          <Button variant="ghost" className={cn("train-save", saved && "is-saved")} onClick={save} disabled={!records.length}>
            {saved ? (
              <>
                <span className="train-save-check" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
                Guardada
              </>
            ) : (
              <>
                <Save size={18} aria-hidden="true" />
                Guardar como rutina
              </>
            )}
          </Button>
        </div>

        {(today.plan?.notes.length ?? 0) > 0 && (
          <div className="notice train-notes">
            <Info size={18} />
            <div className="stack-s">
              {today.plan?.notes.map((note) => <p key={note}>{note}</p>)}
            </div>
          </div>
        )}

        {records.length > 0 && <Muscles primary={today.primary} secondary={today.secondary} />}
      </section>

      <ExercisePicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        onSelect={handlePick}
        replacing={replacing}
        multiple={picker?.mode === "add"}
        exclude={records.map((record) => record.exerciseId)}
      />
      <LoadSheet
        open={Boolean(load?.open)}
        onClose={() => setLoad((current) => (current ? { ...current, open: false } : null))}
        exercise={loadExercise}
        record={loadRecord}
        workouts={today.workouts}
        onChange={changeLoad}
      />
    </>
  );
}

function Muscles({ primary, secondary }: { primary: MuscleGroup[]; secondary: MuscleGroup[] }) {
  return (
    <div className="train-muscles">
      <MuscleMap primary={primary} secondary={secondary} captions={false} label="Músculos que trabaja la sesión" />
      <div className="train-muscles-copy">
        <p className="meta">Músculos de hoy</p>
        <div className="train-muscle-tags">
          {primary.map((muscle) => <span key={muscle} className="badge">{muscleLabels[muscle]}</span>)}
          {secondary.map((muscle) => <span key={muscle} className="badge badge-muted">{muscleLabels[muscle]}</span>)}
        </div>
        <div className="muscle-legend train-legend" aria-hidden="true">
          <span><i className="train-key-primary" />Principal</span>
          <span><i className="train-key-secondary" />Secundario</span>
        </div>
      </div>
    </div>
  );
}

function ProgramExercises({ active, visible }: { active: ActiveProgram; visible: boolean }) {
  const [settings] = useSettings();
  const unit = settings.unit;
  const { program, day, records } = active;
  // Rangos del programa, alineados con los registros (que omiten ejercicios inexistentes).
  const items = (day?.items ?? []).filter((item) => exerciseById(item.exerciseId));
  return (
    <section id="train-exercises" className="train-ex" hidden={!visible} aria-labelledby="train-ex-title">
      <div className="train-ex-head">
        <h2 id="train-ex-title" className="meta">Ejercicios · {day?.name ?? "Sesión"}</h2>
        <Link href={`/entrenar/programas/${program.id}`} className="link-button">
          Ver programa
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <ol className="train-ex-list">
        {records.map((record: ExerciseRecord, index) => {
          const exercise = exerciseById(record.exerciseId);
          if (!exercise) return null;
          const kg = topLoad(record);
          return (
            <li key={`${record.exerciseId}-${index}`}>
              <ExerciseCard
                exercise={exercise}
                index={index}
                meta={(
                  <span className="train-ex-meta">
                    <span className="num train-ex-target">{targetLabel(exercise, record.sets.length, items[index]?.range)}</span>
                    {kg > 0 && <span className="num">{formatNumber(toDisplayWeight(kg, unit))} {unit}</span>}
                    <span className="num">{restText(record.restSeconds ?? 60)} desc.</span>
                  </span>
                )}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
