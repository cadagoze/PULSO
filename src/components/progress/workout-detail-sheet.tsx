"use client";

import { Copy, Play, Trash2, TriangleAlert, Trophy } from "lucide-react";
import { Sheet } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/toast";
import { exerciseName, kindLetters, kindNames, longDayLabel, recordValueLabel, volumeParts, type Unit } from "@/components/progress/format";
import { workoutVolume } from "@/components/progress/period";
import { recordKindLabels } from "@/lib/progression";
import { useStartWorkout } from "@/lib/session";
import { useRoutines, useSettings, useWorkouts } from "@/lib/store";
import { newId } from "@/lib/training";
import { toDisplayWeight } from "@/lib/utils";
import type { ExerciseRecord, SetRecord, WorkoutEntry } from "@/types";
import { confirmAction } from "@/lib/confirm";

const effortLabels = ["", "Muy suave", "Suave", "Moderado", "Duro", "Máximo"];

function freshRecords(records: ExerciseRecord[]) {
  return records.map((record) => ({ ...record, sets: record.sets.map((set) => ({ ...set, done: false })) }));
}

export function WorkoutDetailSheet({ workout, onClose }: { workout: WorkoutEntry | null; onClose: () => void }) {
  const [settings] = useSettings();
  const [, setWorkouts] = useWorkouts();
  const [, setRoutines] = useRoutines();
  const start = useStartWorkout();
  const { toast, show: showToast } = useToast();

  const records = workout?.records ?? [];
  const name = workout?.name ?? "Entrenamiento";
  const volume = volumeParts(workout ? workoutVolume(workout) : 0, settings.unit);

  function repeat() {
    if (!records.length) return;
    start({ name, records: freshRecords(records), source: { type: "free" } });
  }

  function saveRoutine() {
    if (!records.length) return;
    setRoutines((current) => [
      ...current,
      { id: newId("rutina"), name, days: [], restSeconds: settings.defaultRest, records: freshRecords(records), updatedAt: new Date().toISOString() },
    ]);
    showToast(`Guardada en tus rutinas · ${name}`);
  }

  async function remove() {
    if (!workout) return;
    if (!(await confirmAction({ title: "¿Eliminar entrenamiento?", message: `«${name}» del ${longDayLabel(workout.date)}. No se puede deshacer.`, confirmLabel: "Eliminar", danger: true }))) return;
    setWorkouts((current) => current.filter((item) => item.id !== workout.id));
    onClose();
  }

  return (
    <>
      <Sheet
        open={workout !== null}
        onClose={onClose}
        eyebrow={workout ? longDayLabel(workout.date) : undefined}
        title={name}
        className="prog-detail"
      >
        {workout && (
          <>
            <dl className="prog-detail-stats">
              <div><dt className="meta">Duración</dt><dd><span className="num">{Math.round(workout.durationMinutes)}</span><small>min</small></dd></div>
              <div><dt className="meta">Series</dt><dd><span className="num">{workout.sets}</span></dd></div>
              <div><dt className="meta">Volumen</dt><dd><span className="num">{volume.value}</span><small>{volume.unit}</small></dd></div>
            </dl>

            {workout.prs && workout.prs.length > 0 && (
              <section className="prog-detail-prs" aria-label="Récords de esta sesión">
                <p className="meta">{workout.prs.length === 1 ? "Récord de esta sesión" : `${workout.prs.length} récords en esta sesión`}</p>
                {workout.prs.map((pr) => (
                  <p key={`${pr.exerciseId}-${pr.kind}`} className="prog-detail-pr">
                    <Trophy size={15} aria-hidden="true" />
                    <span>
                      <strong>{exerciseName(pr.exerciseId)}</strong> · {recordKindLabels[pr.kind]}{" "}
                      <span className="num">{recordValueLabel(pr.kind, pr.previous, settings.unit)} → {recordValueLabel(pr.kind, pr.value, settings.unit)}</span>
                    </span>
                  </p>
                ))}
              </section>
            )}

            {records.length ? (
              <div className="prog-detail-exercises">
                {records.map((record, index) => (
                  <ExerciseBlock key={`${record.exerciseId}-${index}`} record={record} unit={settings.unit} />
                ))}
              </div>
            ) : (
              <p className="muted">Este registro anterior no tiene detalle por serie.</p>
            )}

            <div className="prog-detail-feedback">
              <p>
                <span className="subtle">Esfuerzo</span>
                <strong>{workout.effort ? `${workout.effort}/5 · ${effortLabels[workout.effort]}` : "Sin registrar"}</strong>
              </p>
              {workout.feltPain && (
                <p className="notice warn">
                  <TriangleAlert size={16} aria-hidden="true" />
                  <span>Reportaste molestias en esta sesión.</span>
                </p>
              )}
              {workout.notes && (
                <p className="prog-detail-notes">
                  <span className="subtle">Notas</span>
                  <span>{workout.notes}</span>
                </p>
              )}
            </div>

            <div className="prog-detail-actions">
              <button type="button" className="btn btn-primary" onClick={repeat} disabled={!records.length}>
                <Play size={17} aria-hidden="true" />
                Repetir
              </button>
              <button type="button" className="btn btn-secondary" onClick={saveRoutine} disabled={!records.length}>
                <Copy size={17} aria-hidden="true" />
                Guardar como rutina
              </button>
              <button type="button" className="btn btn-ghost prog-delete" onClick={remove}>
                <Trash2 size={17} aria-hidden="true" />
                Eliminar
              </button>
            </div>
          </>
        )}
      </Sheet>
      <Toast toast={toast} className="prog-toast" />
    </>
  );
}

function ExerciseBlock({ record, unit }: { record: ExerciseRecord; unit: Unit }) {
  const markers = record.sets.map((set, index) => {
    const kind = set.kind ?? "normal";
    const working = record.sets.slice(0, index + 1).filter((item) => item.kind !== "warmup").length;
    return kindLetters[kind] ?? String(working);
  });
  return (
    <section className="prog-detail-exercise">
      <h3>{exerciseName(record.exerciseId)}</h3>
      <ol className="prog-sets">
        {record.sets.map((set, index) => (
          <SetLine key={index} set={set} marker={markers[index]} kindName={kindNames[set.kind ?? "normal"]} unitKind={record.unit} unit={unit} />
        ))}
      </ol>
      {record.note && <p className="subtle prog-set-note">{record.note}</p>}
    </section>
  );
}

function SetLine({ set, marker, kindName, unitKind, unit }: { set: SetRecord; marker: string; kindName: string; unitKind: ExerciseRecord["unit"]; unit: Unit }) {
  const amount = unitKind === "reps" ? `${set.value} reps` : `${set.value} s`;
  const load = set.load > 0 ? `${toDisplayWeight(set.load, unit).toLocaleString("es-CL")} ${unit} × ` : "";
  return (
    <li className={`prog-set ${set.done ? "" : "skipped"} ${set.kind ?? "normal"}`}>
      <span className="prog-set-marker num" title={kindName} aria-label={kindName}>{marker}</span>
      <span className="prog-set-value num">{load}{amount}</span>
      <span className="prog-set-rir num">{set.rir !== undefined ? `RIR ${set.rir}` : ""}</span>
      {!set.done && <span className="sr-only">No realizada</span>}
    </li>
  );
}
