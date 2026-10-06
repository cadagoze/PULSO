"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link2, StickyNote } from "lucide-react";
import { ExercisePicker } from "@/components/exercises/exercise-picker";
import { MetaLine } from "@/components/ui";
import { beep, primeAudio, useWakeLock, vibrate } from "@/lib/feedback";
import { exerciseBests, progressedSets, warmupSets } from "@/lib/progression";
import type { ExerciseBests } from "@/lib/progression";
import { markProgramSession } from "@/lib/programs";
import { useDraft, useProgram, useSettings, useWorkouts } from "@/lib/store";
import { clockLabel, completedSets, durationSeconds, exerciseById, isWorkingSet, lastRecordFor, recordsVolume, totalSets } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import type { Exercise, ExerciseRecord, SetRecord, Settings, TrainingDraft, WorkoutEntry } from "@/types";
import { ExerciseMenu } from "./exercise-menu";
import type { MenuTarget, MenuView } from "./exercise-menu";
import { ExerciseSets } from "./exercise-sets";
import { FinishSheet } from "./finish-sheet";
import { NoSession, SessionSkeleton } from "./no-session";
import { RestOverlay } from "./rest-timer";
import { RirSheet } from "./rir-sheet";
import { SessionDock } from "./session-dock";
import type { DockMode } from "./session-dock";
import { SessionTopBar } from "./session-header";
import { SessionHero } from "./session-hero";
import { prefersReducedMotion, SessionScreen } from "./session-screen";
import { SessionSheet } from "./session-sheet";
import { SessionSummary } from "./session-summary";
import { SetBlock } from "./set-block";
import type { SetMode } from "./set-block";
import { buildWorkoutEntry, firstPendingRecord, hasPending, nextExerciseAfter, normalizeGroups, primaryMuscles, setBadge, setHeading, sourceLabel, supersetLetters, toggleSuperset, useHydrated, validateSet, volumeLabel } from "./session-utils";
import type { Effort } from "./session-utils";
import { useCountdownCues } from "./use-countdown-cues";
import { clearFinishRequest, finishRequestPending } from "@/components/session/draft-controls";

type SetCountdown = { recordIndex: number; setIndex: number; until: number };
type Picker = { mode: "add" } | { mode: "replace"; index: number };
type SetRef = { recordIndex: number; setIndex: number };
type MenuState = { index: number | null; open: boolean; session: boolean; view?: MenuView };

/** Tiempo (ms) que la serie recién completada queda en lima con su check antes de pasar a la siguiente. */
const HOLD_MS = 650;

/** Pantalla de registro: decide entre resumen, estado vacío y sesión activa, siempre en modo inmersivo oscuro. */
export function SessionLogger() {
  const hydrated = useHydrated();
  const [draft, setDraft] = useDraft();
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const [saved, setSaved] = useState<WorkoutEntry | null>(null);

  let content;
  if (!hydrated) content = <SessionSkeleton />;
  else if (saved) content = <SessionSummary entry={saved} workouts={workouts} settings={settings} />;
  else if (!draft) content = <NoSession />;
  else content = <ActiveSession draft={draft} setDraft={setDraft} settings={settings} onSaved={setSaved} />;
  return <SessionScreen>{content}</SessionScreen>;
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

function scrollToTop() {
  if (window.scrollY > 4) window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
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
  // Ejercicio en pantalla: al volver a la sesión se retoma donde quedaron series pendientes.
  const [current, setCurrent] = useState(() => firstPendingRecord(draft.records));
  const [direction, setDirection] = useState<1 | -1>(1);
  // Serie elegida a mano en la lista; si no, la primera pendiente del ejercicio.
  const [focus, setFocus] = useState<SetRef | null>(null);
  const [justDone, setJustDone] = useState<(SetRef & { next: number }) | null>(null);
  const [menu, setMenu] = useState<MenuState>({ index: null, open: false, session: false });
  const [sessionOpen, setSessionOpen] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [rirTarget, setRirTarget] = useState<SetRef | null>(null);
  // «Terminar y guardar» desde Inicio o la barra del entrenamiento en curso (o «?terminar» al recargar): abre la hoja para guardar.
  const [finishOpen, setFinishOpen] = useState(() => (finishRequestPending() || new URLSearchParams(window.location.search).has("terminar")) && completedSets(draft.records) > 0);
  const [error, setError] = useState<(SetRef & { message: string }) | null>(null);
  const [countdown, setCountdown] = useState<SetCountdown | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const draftRef = useRef(draft);
  const settingsRef = useRef(settings);
  const finishNow = useNow(finishOpen ? 1000 : 60_000);
  const unit = settings.unit;
  const count = draft.records.length;
  const index = count ? Math.min(current, count - 1) : 0;

  useEffect(() => {
    draftRef.current = draft;
    settingsRef.current = settings;
  });
  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);
  useEffect(() => {
    clearFinishRequest();
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useWakeLock(settings.keepAwake && draft.runningSince !== null);

  // Tras el check, la serie hecha queda un instante en lima y luego da paso a la siguiente (o al siguiente ejercicio).
  useEffect(() => {
    if (!justDone) return;
    const timer = window.setTimeout(() => {
      setJustDone(null);
      if (justDone.next !== justDone.recordIndex) {
        setDirection(justDone.next > justDone.recordIndex ? 1 : -1);
        setCurrent(justDone.next);
        scrollToTop();
      }
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [justDone]);

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
      // Como en Hevy: al terminar de cambiar una carga, se copia a las series siguientes pendientes
      // que todavía tenían la carga anterior (comparada con el valor previo al cambio).
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
        setError({ recordIndex, setIndex, message: `Revisa la serie ${setBadge(record.sets, setIndex)}: ${problem}` });
        setFocus({ recordIndex, setIndex });
        return;
      }
    }
    primeAudio();
    setError(null);
    setCountdown((value) => (value?.recordIndex === recordIndex && value.setIndex === setIndex ? null : value));
    const completing = !set.done;
    const toggled = (records: ExerciseRecord[]) => records.map((item, index) => (index !== recordIndex ? item : {
      ...item,
      sets: item.sets.map((row, position) => (position === setIndex ? { ...row, done: completing } : row)),
    }));
    const records = toggled(current.records);
    const partner = current.records[recordIndex + 1];
    const nextInSuperset = Boolean(record.group) && partner?.group === record.group && partner.sets.some((row) => !row.done);
    const rest = record.restSeconds ?? current.restSeconds;
    // Tras la última serie de la sesión no hace falta descanso: toca terminar.
    const startRest = completing && settingsRef.current.autoRest && !nextInSuperset && records.some(hasPending) && rest > 0 && current.runningSince !== null;
    const now = Date.now();
    patch((draftNow) => ({
      ...draftNow,
      ...(startRest ? { restUntil: now + rest * 1000, restTotal: rest } : {}),
      records: toggled(draftNow.records),
    }));
    if (!completing) return;
    if (settingsRef.current.vibration) vibrate(30);
    if (settingsRef.current.sound) beep({ frequency: 1180, duration: 0.05 });
    setFocus(null);
    setJustDone({ recordIndex, setIndex, next: nextExerciseAfter(records, recordIndex) });
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

  function skipRest() {
    patch((current) => ({ ...current, restUntil: null }));
  }

  /** Cambia de ejercicio (flechas, deslizar, lista o «Ver sesión»). */
  function goTo(target: number) {
    if (target < 0 || target >= draft.records.length) return;
    setJustDone(null);
    setFocus(null);
    if (target === index) return;
    setDirection(target > index ? 1 : -1);
    setCurrent(target);
    scrollToTop();
  }

  function focusSet(setIndex: number) {
    setJustDone(null);
    setFocus({ recordIndex: index, setIndex });
    scrollToTop();
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

  function replaceExercise(position: number, exercise: Exercise) {
    updateRecord(position, (record) => {
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
    setFocus(null);
    showToast(`Sustituido por ${exercise.name}`);
  }

  function addWarmups(position: number) {
    const record = draft.records[position];
    const exercise = record ? exerciseById(record.exerciseId) : undefined;
    if (!record || !exercise) return;
    const heaviest = Math.max(0, ...record.sets.filter(isWorkingSet).map((set) => set.load));
    const sets = warmupSets(heaviest, Boolean(exercise.barbell), settings.barWeight);
    closeMenu();
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
    updateRecord(position, (currentRecord) => ({
      ...currentRecord,
      sets: [...doneWarmups, ...missing, ...currentRecord.sets.filter((set) => set.kind !== "warmup")],
    }));
    setCountdown(null);
    setFocus(null);
    showToast(`${missing.length} ${missing.length === 1 ? "serie" : "series"} de calentamiento agregadas`);
  }

  function moveExercise(position: number, step: -1 | 1) {
    const target = position + step;
    closeMenu();
    if (target < 0 || target >= draft.records.length) return;
    patch((current) => {
      if (target >= current.records.length) return current;
      const records = [...current.records];
      [records[position], records[target]] = [records[target], records[position]];
      return { ...current, records: normalizeGroups(records) };
    });
    // La pantalla sigue mostrando el mismo ejercicio en su nueva posición.
    setCurrent((value) => (value === position ? target : value === target ? position : value));
    setCountdown(null);
    setFocus(null);
  }

  function deleteExercise(position: number) {
    const exercise = exerciseById(draft.records[position]?.exerciseId ?? -1);
    if (!window.confirm(`¿Eliminar ${exercise?.name ?? "este ejercicio"} de la sesión?`)) return;
    patch((current) => ({ ...current, records: normalizeGroups(current.records.filter((_, item) => item !== position)) }));
    setCurrent((value) => (value > position ? value - 1 : value));
    setCountdown(null);
    setError(null);
    setFocus(null);
    setJustDone(null);
    closeMenu();
  }

  function discard() {
    if (!window.confirm("¿Descartar este entrenamiento? Se perderán las series sin guardar. Tu historial no cambia.")) return;
    setDraft(null);
  }

  function save(effort: Effort, feltPain: boolean) {
    const current = draftRef.current;
    if (!completedSets(current.records)) return;
    const entry = buildWorkoutEntry(current, workouts, { effort, feltPain }, Date.now());
    const stored = setWorkouts((items) => [entry, ...items.filter((item) => item.id !== entry.id)]);
    if (!stored) {
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

  function openMenu(position: number | null, options: { session?: boolean; view?: MenuView } = {}) {
    setMenu({ index: position, open: true, session: Boolean(options.session), view: options.view });
  }

  function closeMenu() {
    setMenu((value) => ({ ...value, open: false }));
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

  const record = draft.records[index];
  const exercise = record ? exerciseById(record.exerciseId) : undefined;
  const info = record ? history.get(record.exerciseId) : undefined;
  const holdSet = justDone && justDone.recordIndex === index ? justDone.setIndex : null;
  const manualSet = focus && record && focus.recordIndex === index && focus.setIndex < record.sets.length ? focus.setIndex : null;
  const setIndex = holdSet ?? manualSet ?? (record ? record.sets.findIndex((set) => !set.done) : -1);
  const setMode: SetMode = holdSet !== null ? "hold" : setIndex >= 0 ? (record?.sets[setIndex]?.done ? "review" : "set") : total > 0 && done === total ? "all-done" : "exercise-done";
  const dockMode: DockMode = record && exercise ? setMode : "empty";
  const paused = draft.runningSince === null;

  const neighbour = (position: number) => {
    const item = draft.records[position];
    const found = item ? exerciseById(item.exerciseId) : undefined;
    return item && found ? { index: position, exercise: found, record: item } : null;
  };
  const previousItem = neighbour(index - 1);
  const nextItem = neighbour(index + 1);

  // Lo que viene tras el descanso, para el anillo: la serie siguiente o el siguiente ejercicio.
  const upcomingIndex = justDone ? justDone.next : index;
  const upcomingRecord = draft.records[upcomingIndex];
  const upcomingSet = upcomingRecord ? upcomingRecord.sets.findIndex((set) => !set.done) : -1;
  const upcoming = !upcomingRecord || upcomingSet < 0 ? undefined
    : upcomingIndex !== index ? exerciseById(upcomingRecord.exerciseId)?.name : setHeading(upcomingRecord.sets, upcomingSet);

  const menuRecord = menu.index !== null ? draft.records[menu.index] : undefined;
  const menuExercise = menuRecord ? exerciseById(menuRecord.exerciseId) : undefined;
  const menuTarget: MenuTarget | null = menu.index !== null && menuRecord && menuExercise
    ? { record: menuRecord, exercise: menuExercise, index: menu.index, count, linkedWithNext: Boolean(menuRecord.group) && draft.records[menu.index + 1]?.group === menuRecord.group }
    : null;
  const rirSet = rirTarget ? draft.records[rirTarget.recordIndex]?.sets[rirTarget.setIndex] : undefined;
  const replacing = picker?.mode === "replace" ? exerciseById(draft.records[picker.index]?.exerciseId ?? -1) : undefined;

  return (
    <div className="ses-active">
      <SessionHero
        exercise={exercise}
        mediaKey={`${index}-${record?.exerciseId ?? "vacía"}`}
        direction={direction}
        prev={previousItem?.exercise.name}
        next={nextItem?.exercise.name}
        onPrev={() => previousItem && goTo(previousItem.index)}
        onNext={() => nextItem && goTo(nextItem.index)}
        topBar={(
          <SessionTopBar
            draft={draft}
            current={index}
            onTogglePause={togglePause}
            onOpenSession={() => setSessionOpen(true)}
            onOpenMenu={() => openMenu(record && exercise ? index : null, { session: true })}
          />
        )}
        overlay={record ? (ringSize) => (
          <RestOverlay
            restUntil={draft.restUntil}
            restTotal={draft.restTotal ?? draft.restSeconds}
            sound={settings.sound}
            vibration={settings.vibration}
            size={ringSize}
            upcoming={upcoming}
          />
        ) : undefined}
      />

      <div className="ses-panel">
        {record && exercise ? (
          <header key={`head-${index}-${record.exerciseId}`} className={cn("ses-head", direction < 0 && "from-prev")}>
            {record.group && (
              <span className="photo-tag glass ses-head-tag"><Link2 size={13} aria-hidden="true" />Superserie {letters.get(record.group)} · alterna sin descanso</span>
            )}
            <h1 className="ses-name">{exercise.name}</h1>
            <MetaLine className="ses-muscles" items={primaryMuscles(exercise)} />
            {record.note && <p className="ses-head-note"><StickyNote size={14} aria-hidden="true" /><span>{record.note}</span></p>}
          </header>
        ) : (
          <header className="ses-head">
            <p className="meta">{sourceLabel(draft.source)}</p>
            <h1 className="ses-name">Agrega tu primer ejercicio</h1>
            <p className="ses-head-text">Busca por nombre o músculo. Prellenamos las series con tu última vez.</p>
          </header>
        )}

        {record && exercise && (
          <SetBlock
            mode={setMode}
            recordIndex={index}
            record={record}
            exercise={exercise}
            setIndex={setIndex}
            last={info?.last}
            bests={info?.bests ?? exerciseBests([], record.exerciseId)}
            loadUnit={unit}
            error={error?.recordIndex === index ? error.message : null}
            countdown={countdown?.recordIndex === index ? { setIndex: countdown.setIndex, until: countdown.until } : null}
            paused={paused}
            vibration={settings.vibration}
            sessionDone={done}
            sessionTotal={total}
            onSet={onSet}
            onToggle={onToggle}
            onRir={onRir}
            onCountdown={onCountdown}
            onCountdownDismiss={onCountdownDismiss}
            onTogglePause={togglePause}
            onAddSet={onAddSet}
          />
        )}

        <SessionDock
          mode={dockMode}
          restUntil={draft.restUntil}
          onComplete={() => { if (setIndex >= 0) onToggle(index, setIndex); }}
          onResume={() => setFocus(null)}
          onNextExercise={() => goTo(nextExerciseAfter(draft.records, index))}
          onFinish={() => setFinishOpen(true)}
          onAdd={() => setPicker({ mode: "add" })}
          onAdjustRest={adjustRest}
          onSkipRest={skipRest}
        />

        {record && exercise && (
          <ExerciseSets
            key={`sets-${index}-${record.exerciseId}`}
            recordIndex={index}
            record={record}
            exercise={exercise}
            last={info?.last}
            bests={info?.bests ?? exerciseBests([], record.exerciseId)}
            loadUnit={unit}
            focusedSet={setIndex}
            previousExercise={previousItem}
            nextExercise={nextItem}
            onFocus={focusSet}
            onToggle={onToggle}
            onSet={onSet}
            onAddSet={onAddSet}
            onRemoveSet={onRemoveSet}
            onGo={goTo}
            onOpenSession={() => setSessionOpen(true)}
          />
        )}
      </div>

      {countdown && <CountdownWatcher countdown={countdown} sound={settings.sound} vibration={settings.vibration} />}

      <SessionSheet
        open={sessionOpen}
        onClose={() => setSessionOpen(false)}
        draft={draft}
        current={index}
        done={done}
        total={total}
        volume={volume}
        onRename={(name) => patch((currentDraft) => ({ ...currentDraft, name }))}
        onRenameBlur={() => {
          if (!draftRef.current.name.trim()) patch((currentDraft) => ({ ...currentDraft, name: "Entrenamiento" }));
        }}
        onNotes={(notes) => patch((currentDraft) => ({ ...currentDraft, notes }))}
        onJump={(position) => {
          setSessionOpen(false);
          goTo(position);
        }}
        onMenu={(position) => openMenu(position)}
        onAdd={() => setPicker({ mode: "add" })}
        onFinish={() => {
          setSessionOpen(false);
          setFinishOpen(true);
        }}
        onDiscard={discard}
      />

      <ExerciseMenu
        open={menu.open}
        target={menuTarget}
        initialView={menu.view}
        defaultRest={draft.restSeconds}
        loadUnit={unit}
        barWeight={settings.barWeight}
        plates={settings.plates}
        session={menu.session ? {
          sessionRest: draft.restSeconds,
          onSessionRest: (seconds) => patch((currentDraft) => ({ ...currentDraft, restSeconds: seconds })),
          onOpenSession: () => {
            closeMenu();
            setSessionOpen(true);
          },
          onAdd: () => {
            closeMenu();
            setPicker({ mode: "add" });
          },
          onFinish: () => {
            closeMenu();
            setFinishOpen(true);
          },
          onDiscard: () => {
            closeMenu();
            discard();
          },
        } : undefined}
        onClose={closeMenu}
        onReplace={() => {
          if (menu.index === null) return;
          closeMenu();
          setPicker({ mode: "replace", index: menu.index });
        }}
        onWarmup={() => { if (menu.index !== null) addWarmups(menu.index); }}
        onRest={(seconds) => {
          if (menu.index === null) return;
          updateRecord(menu.index, (item) => {
            const next = { ...item };
            if (seconds === undefined) delete next.restSeconds;
            else next.restSeconds = seconds;
            return next;
          });
          closeMenu();
          showToast(seconds === undefined ? "Usará el descanso general" : `Descanso de ${seconds} s`);
        }}
        onNote={(note) => {
          if (menu.index === null) return;
          updateRecord(menu.index, (item) => {
            const next = { ...item };
            if (note) next.note = note;
            else delete next.note;
            return next;
          });
          closeMenu();
        }}
        onMove={(step) => { if (menu.index !== null) moveExercise(menu.index, step); }}
        onSuperset={() => {
          if (menu.index === null) return;
          const position = menu.index;
          patch((currentDraft) => ({ ...currentDraft, records: toggleSuperset(currentDraft.records, position) }));
          closeMenu();
        }}
        onDelete={() => { if (menu.index !== null) deleteExercise(menu.index); }}
      />

      <ExercisePicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        multiple={picker?.mode === "add"}
        title={picker?.mode === "replace" ? "Sustituir ejercicio" : "Agregar ejercicios"}
        replacing={replacing}
        exclude={draft.records.map((item) => item.exerciseId)}
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
            updateRecord(rirTarget.recordIndex, (item) => ({
              ...item,
              sets: item.sets.map((set, position) => {
                if (position !== rirTarget.setIndex) return set;
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
