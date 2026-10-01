"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Plus, Trash2 } from "lucide-react";
import { ExercisePicker } from "@/components/exercises/exercise-picker";
import { beep, primeAudio, useWakeLock, vibrate } from "@/lib/feedback";
import { exerciseBests, progressedSets, warmupSets } from "@/lib/progression";
import type { ExerciseBests } from "@/lib/progression";
import { markProgramSession } from "@/lib/programs";
import { useDraft, useProgram, useSettings, useWorkouts } from "@/lib/store";
import { clockLabel, completedSets, durationSeconds, exerciseById, isWorkingSet, lastRecordFor, recordsVolume, totalSets } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import type { Exercise, ExerciseRecord, SetRecord, Settings, TrainingDraft, WorkoutEntry } from "@/types";
import { ExerciseCard } from "./exercise-card";
import type { GroupPosition } from "./exercise-card";
import { ExerciseMenu } from "./exercise-menu";
import { FinishSheet } from "./finish-sheet";
import { NoSession, SessionSkeleton } from "./no-session";
import { RestTimer } from "./rest-timer";
import { RirSheet } from "./rir-sheet";
import { SessionHeader } from "./session-header";
import { SessionSummary } from "./session-summary";
import { buildWorkoutEntry, normalizeGroups, setBadge, sourceLabel, supersetLetters, toggleSuperset, useHydrated, validateSet, volumeLabel } from "./session-utils";
import type { Effort } from "./session-utils";
import { useCountdownCues } from "./use-countdown-cues";

type SetCountdown = { recordIndex: number; setIndex: number; until: number };
type Picker = { mode: "add" } | { mode: "replace"; index: number };

/** Pantalla de registro: decide entre resumen, estado vacío y sesión activa. */
export function SessionLogger() {
  const hydrated = useHydrated();
  const [draft, setDraft] = useDraft();
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const [saved, setSaved] = useState<WorkoutEntry | null>(null);

  if (!hydrated) return <SessionSkeleton />;
  if (saved) return <SessionSummary entry={saved} workouts={workouts} settings={settings} />;
  if (!draft) return <NoSession />;
  return <ActiveSession draft={draft} setDraft={setDraft} settings={settings} onSaved={setSaved} />;
}

/** Avisos del temporizador por serie (ejercicios por tiempo). No pinta nada. */
function CountdownWatcher({ countdown, sound, vibration }: { countdown: SetCountdown; sound: boolean; vibration: boolean }) {
  const now = useNow(250);
  useCountdownCues({
    key: `${countdown.recordIndex}-${countdown.setIndex}-${countdown.until}`,
    remainingMs: countdown.until - now,
    now,
    onTick: () => {
      if (sound) beep({ frequency: 660, duration: 0.09 });
    },
    onEnd: () => {
      if (sound) beep({ count: 3, finalLong: true });
      if (vibration) vibrate([200, 100, 200]);
    },
  });
  return null;
}

function groupPosition(records: ExerciseRecord[], index: number): GroupPosition {
  const group = records[index].group;
  if (!group) return null;
  const before = records[index - 1]?.group === group;
  const after = records[index + 1]?.group === group;
  if (before && after) return "middle";
  if (after) return "first";
  return before ? "last" : null;
}

interface ActiveSessionProps {
  draft: TrainingDraft;
  setDraft: ReturnType<typeof useDraft>[1];
  settings: Settings;
  onSaved: (entry: WorkoutEntry) => void;
}

function ActiveSession({ draft, setDraft, settings, onSaved }: ActiveSessionProps) {
  const [workouts, setWorkouts] = useWorkouts();
  const [, setProgram] = useProgram();
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [rirTarget, setRirTarget] = useState<{ recordIndex: number; setIndex: number } | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [error, setError] = useState<{ recordIndex: number; message: string } | null>(null);
  const [countdown, setCountdown] = useState<SetCountdown | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const draftRef = useRef(draft);
  const settingsRef = useRef(settings);
  const finishNow = useNow(finishOpen ? 1000 : 60_000);
  const unit = settings.unit;

  useEffect(() => {
    draftRef.current = draft;
    settingsRef.current = settings;
  });
  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  useWakeLock(settings.keepAwake && draft.runningSince !== null);

  const patch = useCallback((update: (current: TrainingDraft) => TrainingDraft) => {
    setDraft((current) => (current ? update(current) : current));
  }, [setDraft]);

  const updateRecord = useCallback((recordIndex: number, update: (record: ExerciseRecord) => ExerciseRecord) => {
    patch((current) => ({ ...current, records: current.records.map((record, index) => (index === recordIndex ? update(record) : record)) }));
  }, [patch]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  // ─── Series ───────────────────────────────────────────────────────────
  const onSet = useCallback((recordIndex: number, setIndex: number, setPatch: Partial<SetRecord>, options?: { carryFrom?: number }) => {
    updateRecord(recordIndex, (record) => {
      const edited = record.sets[setIndex];
      // Como en Hevy: al terminar de escribir una carga, se copia a las series siguientes pendientes
      // que todavía tenían la carga anterior (comparada con el valor al enfocar el campo).
      const carryFrom = options?.carryFrom;
      const carry = carryFrom !== undefined && setPatch.load !== undefined && edited !== undefined && isWorkingSet(edited);
      return {
        ...record,
        sets: record.sets.map((set, index) => {
          if (index === setIndex) return { ...set, ...setPatch };
          if (carry && index > setIndex && !set.done && isWorkingSet(set) && set.load === carryFrom) return { ...set, load: setPatch.load ?? set.load };
          return set;
        }),
      };
    });
    setError((current) => (current?.recordIndex === recordIndex ? null : current));
  }, [updateRecord]);

  const onToggle = useCallback((recordIndex: number, setIndex: number) => {
    const current = draftRef.current;
    const record = current.records[recordIndex];
    const set = record?.sets[setIndex];
    if (!record || !set) return;
    if (!set.done) {
      const problem = validateSet(set, record.unit);
      if (problem) {
        setError({ recordIndex, message: `Revisa la serie ${setBadge(record.sets, setIndex)}: ${problem}` });
        return;
      }
    }
    primeAudio();
    setError(null);
    setCountdown((value) => (value?.recordIndex === recordIndex && value.setIndex === setIndex ? null : value));
    const completing = !set.done;
    const partner = current.records[recordIndex + 1];
    const nextInSuperset = Boolean(record.group) && partner?.group === record.group && partner.sets.some((row) => !row.done);
    const rest = record.restSeconds ?? current.restSeconds;
    const startRest = completing && settingsRef.current.autoRest && !nextInSuperset && rest > 0 && current.runningSince !== null;
    const now = Date.now();
    patch((draftNow) => ({
      ...draftNow,
      ...(startRest ? { restUntil: now + rest * 1000, restTotal: rest } : {}),
      records: draftNow.records.map((item, index) => (index !== recordIndex ? item : {
        ...item,
        sets: item.sets.map((row, position) => (position === setIndex ? { ...row, done: completing } : row)),
      })),
    }));
    if (completing && settingsRef.current.vibration) vibrate(30);
  }, [patch]);

  const onAddSet = useCallback((recordIndex: number) => {
    updateRecord(recordIndex, (record) => {
      const lastSet = record.sets[record.sets.length - 1];
      const copy: SetRecord = lastSet
        ? { value: lastSet.value, load: lastSet.load, done: false, kind: lastSet.kind === "warmup" ? "normal" : lastSet.kind ?? "normal" }
        : { value: exerciseById(record.exerciseId)?.range[0] ?? 10, load: 0, done: false, kind: "normal" };
      return { ...record, sets: [...record.sets, copy] };
    });
  }, [updateRecord]);

  const onRemoveSet = useCallback((recordIndex: number) => {
    updateRecord(recordIndex, (record) => (record.sets.length <= 1 ? record : { ...record, sets: record.sets.slice(0, -1) }));
    setCountdown((value) => (value?.recordIndex === recordIndex ? null : value));
  }, [updateRecord]);

  const onRir = useCallback((recordIndex: number, setIndex: number) => setRirTarget({ recordIndex, setIndex }), []);

  const onCountdown = useCallback((recordIndex: number, setIndex: number) => {
    const set = draftRef.current.records[recordIndex]?.sets[setIndex];
    if (!set) return;
    primeAudio();
    setCountdown((value) => {
      if (value && value.recordIndex === recordIndex && value.setIndex === setIndex) return null;
      return { recordIndex, setIndex, until: Date.now() + Math.max(1, set.value) * 1000 };
    });
  }, []);

  const onCountdownDismiss = useCallback(() => setCountdown(null), []);
  const onMenu = useCallback((recordIndex: number) => setMenuIndex(recordIndex), []);

  // ─── Sesión ───────────────────────────────────────────────────────────
  function togglePause() {
    const now = Date.now();
    patch((current) => (current.runningSince === null
      ? { ...current, runningSince: now }
      : { ...current, elapsedSeconds: durationSeconds(current, now), runningSince: null, restUntil: null }));
  }

  function adjustRest(delta: number) {
    const now = Date.now();
    patch((current) => {
      if (current.restUntil === null) return current;
      const until = Math.max(now, current.restUntil + delta * 1000);
      return { ...current, restUntil: until, restTotal: Math.max(1, (current.restTotal ?? current.restSeconds) + Math.max(0, delta)) };
    });
  }

  function lastFor(exercise: Exercise) {
    return lastRecordFor(workouts, exercise.id, draft.id);
  }

  function addExercises(items: Exercise[]) {
    const records = items.map<ExerciseRecord>((exercise) => ({
      exerciseId: exercise.id,
      unit: exercise.unit,
      sets: progressedSets(exercise, exercise.sets, lastFor(exercise)),
    }));
    patch((current) => ({ ...current, records: [...current.records, ...records] }));
    if (records.length) showToast(records.length === 1 ? "Ejercicio agregado" : `${records.length} ejercicios agregados`);
  }

  function replaceExercise(index: number, exercise: Exercise) {
    updateRecord(index, (record) => {
      const replaced: ExerciseRecord = {
        exerciseId: exercise.id,
        unit: exercise.unit,
        sets: progressedSets(exercise, Math.max(1, record.sets.length), lastFor(exercise)),
        ...(record.restSeconds !== undefined ? { restSeconds: record.restSeconds } : {}),
        ...(record.group ? { group: record.group } : {}),
      };
      return replaced;
    });
    setCountdown(null);
    showToast(`Sustituido por ${exercise.name}`);
  }

  function addWarmups(index: number) {
    const record = draft.records[index];
    const exercise = record ? exerciseById(record.exerciseId) : undefined;
    if (!record || !exercise) return;
    const heaviest = Math.max(0, ...record.sets.filter(isWorkingSet).map((set) => set.load));
    const sets = warmupSets(heaviest, Boolean(exercise.barbell), settings.barWeight);
    setMenuIndex(null);
    if (!sets.length) {
      showToast(heaviest > 0 ? "Con esta carga no hacen falta series de aproximación" : "Anota primero tu carga de trabajo");
      return;
    }
    const doneWarmups = record.sets.filter((set) => set.kind === "warmup" && set.done);
    const missing = sets.filter((set) => !doneWarmups.some((done) => done.load === set.load));
    if (!missing.length) {
      showToast("Ya completaste el calentamiento para esta carga");
      return;
    }
    // Calentamientos hechos primero, luego los que faltan (de menor a mayor carga) y después las series de trabajo.
    updateRecord(index, (current) => ({
      ...current,
      sets: [...doneWarmups, ...missing, ...current.sets.filter((set) => set.kind !== "warmup")],
    }));
    setCountdown(null);
    showToast(`${missing.length} ${missing.length === 1 ? "serie" : "series"} de calentamiento agregadas`);
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const target = index + direction;
    patch((current) => {
      if (target < 0 || target >= current.records.length) return current;
      const records = [...current.records];
      [records[index], records[target]] = [records[target], records[index]];
      return { ...current, records: normalizeGroups(records) };
    });
    setCountdown(null);
    setMenuIndex(null);
  }

  function deleteExercise(index: number) {
    const exercise = exerciseById(draft.records[index]?.exerciseId ?? -1);
    if (!window.confirm(`¿Eliminar ${exercise?.name ?? "este ejercicio"} de la sesión?`)) return;
    patch((current) => ({ ...current, records: normalizeGroups(current.records.filter((_, position) => position !== index)) }));
    setCountdown(null);
    setError(null);
    setMenuIndex(null);
  }

  function discard() {
    if (!window.confirm("¿Descartar este entrenamiento? Se perderán las series sin guardar. Tu historial no cambia.")) return;
    setDraft(null);
  }

  function save(effort: Effort, feltPain: boolean) {
    const current = draftRef.current;
    if (!completedSets(current.records)) return;
    const entry = buildWorkoutEntry(current, workouts, { effort, feltPain }, Date.now());
    const saved = setWorkouts((items) => [entry, ...items.filter((item) => item.id !== entry.id)]);
    if (!saved) {
      // Sin espacio en el dispositivo: se conserva el borrador para no perder el entrenamiento.
      showToast("No se pudo guardar: el almacenamiento del dispositivo está lleno. Exporta un respaldo y libera espacio.");
      return;
    }
    const source = current.source;
    if (source?.type === "program") setProgram((progress) => markProgramSession(progress, source.programId, source.week, source.day));
    setFinishOpen(false);
    onSaved(entry);
    setDraft(null);
  }

  // ─── Datos derivados ─────────────────────────────────────────────────
  const done = completedSets(draft.records);
  const total = totalSets(draft.records);
  const volume = volumeLabel(recordsVolume(draft.records), unit);
  const letters = useMemo(() => supersetLetters(draft.records), [draft.records]);
  const exerciseIds = draft.records.map((record) => record.exerciseId).join(",");
  const history = useMemo(() => {
    const map = new Map<number, { last?: ExerciseRecord; bests: ExerciseBests }>();
    for (const id of exerciseIds.split(",").filter(Boolean).map(Number)) {
      map.set(id, { last: lastRecordFor(workouts, id, draft.id), bests: exerciseBests(workouts, id, draft.id) });
    }
    return map;
  }, [draft.id, exerciseIds, workouts]);

  const menuRecord = menuIndex !== null ? draft.records[menuIndex] : undefined;
  const menuExercise = menuRecord ? exerciseById(menuRecord.exerciseId) : undefined;
  const rirSet = rirTarget ? draft.records[rirTarget.recordIndex]?.sets[rirTarget.setIndex] : undefined;
  const replacing = picker?.mode === "replace" ? exerciseById(draft.records[picker.index]?.exerciseId ?? -1) : undefined;
  const paused = draft.runningSince === null;

  return (
    <div className="ses-page">
      <SessionHeader
        draft={draft}
        done={done}
        total={total}
        volume={volume}
        onTogglePause={togglePause}
        onFinish={() => setFinishOpen(true)}
      />

      <div className="ses-intro">
        <p className="eyebrow">{sourceLabel(draft.source)}</p>
        <input
          className="ses-name"
          value={draft.name}
          maxLength={60}
          aria-label="Nombre del entrenamiento"
          onChange={(event) => {
            const name = event.target.value;
            patch((current) => ({ ...current, name }));
          }}
          onBlur={() => {
            if (!draftRef.current.name.trim()) patch((current) => ({ ...current, name: "Entrenamiento" }));
          }}
        />
        <p className="subtle ses-autosave">Se guarda solo en este dispositivo mientras entrenas.</p>
      </div>

      {paused && (
        <button type="button" className="ses-paused" onClick={togglePause}>
          <Pause size={18} />
          <span><b>En pausa.</b> El reloj está detenido. Toca para reanudar.</span>
        </button>
      )}

      {draft.records.length === 0 ? (
        <div className="ses-first">
          <h2>Agrega tu primer ejercicio</h2>
          <p className="muted">Busca por nombre o músculo. Prellenamos las series con tu última vez.</p>
          <button type="button" className="btn btn-primary" onClick={() => setPicker({ mode: "add" })}>
            <Plus size={18} /> Agregar ejercicios
          </button>
        </div>
      ) : (
        <div className="ses-list">
          {draft.records.map((record, index) => {
            const exercise = exerciseById(record.exerciseId);
            if (!exercise) return null;
            const info = history.get(record.exerciseId);
            return (
              <ExerciseCard
                key={`${record.exerciseId}-${index}`}
                index={index}
                record={record}
                exercise={exercise}
                last={info?.last}
                bests={info?.bests ?? exerciseBests([], record.exerciseId)}
                loadUnit={unit}
                groupLetter={record.group ? letters.get(record.group) : undefined}
                groupPosition={groupPosition(draft.records, index)}
                countdown={countdown?.recordIndex === index ? { setIndex: countdown.setIndex, until: countdown.until } : null}
                error={error?.recordIndex === index ? error.message : null}
                onSet={onSet}
                onToggle={onToggle}
                onRir={onRir}
                onCountdown={onCountdown}
                onCountdownDismiss={onCountdownDismiss}
                onAddSet={onAddSet}
                onRemoveSet={onRemoveSet}
                onMenu={onMenu}
              />
            );
          })}
        </div>
      )}

      <section className="ses-bottom">
        {draft.records.length > 0 && (
          <button type="button" className="btn btn-secondary btn-block ses-add" onClick={() => setPicker({ mode: "add" })}>
            <Plus size={18} /> Agregar ejercicios
          </button>
        )}
        <label className="field">
          Notas de la sesión
          <textarea
            value={draft.notes}
            maxLength={1000}
            placeholder="Cómo te sentiste, ajustes de técnica, energía…"
            onChange={(event) => {
              const notes = event.target.value;
              patch((current) => ({ ...current, notes }));
            }}
          />
        </label>
        <button type="button" className="btn btn-dark btn-block" onClick={() => setFinishOpen(true)}>Terminar entrenamiento</button>
        <button type="button" className="ses-discard" onClick={discard}>
          <Trash2 size={16} /> Descartar entrenamiento
        </button>
      </section>

      <RestTimer
        restUntil={draft.restUntil}
        restTotal={draft.restTotal ?? draft.restSeconds}
        sound={settings.sound}
        vibration={settings.vibration}
        onAdjust={adjustRest}
        onSkip={() => patch((current) => ({ ...current, restUntil: null }))}
      />

      {countdown && <CountdownWatcher countdown={countdown} sound={settings.sound} vibration={settings.vibration} />}

      {menuRecord && menuExercise && menuIndex !== null && (
        <ExerciseMenu
          key={menuIndex}
          record={menuRecord}
          exercise={menuExercise}
          index={menuIndex}
          count={draft.records.length}
          linkedWithNext={Boolean(menuRecord.group) && draft.records[menuIndex + 1]?.group === menuRecord.group}
          defaultRest={draft.restSeconds}
          loadUnit={unit}
          barWeight={settings.barWeight}
          plates={settings.plates}
          onClose={() => setMenuIndex(null)}
          onReplace={() => {
            setMenuIndex(null);
            setPicker({ mode: "replace", index: menuIndex });
          }}
          onWarmup={() => addWarmups(menuIndex)}
          onRest={(seconds) => {
            updateRecord(menuIndex, (record) => {
              const next = { ...record };
              if (seconds === undefined) delete next.restSeconds;
              else next.restSeconds = seconds;
              return next;
            });
            setMenuIndex(null);
            showToast(seconds === undefined ? "Usará el descanso general" : `Descanso de ${seconds} s`);
          }}
          onNote={(note) => {
            updateRecord(menuIndex, (record) => {
              const next = { ...record };
              if (note) next.note = note;
              else delete next.note;
              return next;
            });
            setMenuIndex(null);
          }}
          onMove={(direction) => moveExercise(menuIndex, direction)}
          onSuperset={() => {
            patch((current) => ({ ...current, records: toggleSuperset(current.records, menuIndex) }));
            setMenuIndex(null);
          }}
          onDelete={() => deleteExercise(menuIndex)}
        />
      )}

      <ExercisePicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        multiple={picker?.mode === "add"}
        title={picker?.mode === "replace" ? "Sustituir ejercicio" : "Agregar ejercicios"}
        replacing={replacing}
        exclude={draft.records.map((record) => record.exerciseId)}
        onSelect={(items) => {
          if (picker?.mode === "replace") {
            if (items[0]) replaceExercise(picker.index, items[0]);
          } else {
            addExercises(items);
          }
          setPicker(null);
        }}
      />

      <RirSheet
        open={rirTarget !== null && rirSet !== undefined}
        setLabel={rirTarget ? `Serie ${setBadge(draft.records[rirTarget.recordIndex]?.sets ?? [], rirTarget.setIndex)}` : ""}
        value={rirSet?.rir}
        onClose={() => setRirTarget(null)}
        onSelect={(value) => {
          if (rirTarget) {
            updateRecord(rirTarget.recordIndex, (record) => ({
              ...record,
              sets: record.sets.map((set, index) => {
                if (index !== rirTarget.setIndex) return set;
                const next = { ...set };
                if (value === undefined) delete next.rir;
                else next.rir = value;
                return next;
              }),
            }));
          }
          setRirTarget(null);
        }}
      />

      <FinishSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        duration={finishNow ? clockLabel(durationSeconds(draft, finishNow)) : "--:--"}
        done={done}
        total={total}
        volume={volume}
        onSave={save}
      />

      {toast && <div className="toast ses-toast" role="status">{toast}</div>}
    </div>
  );
}
