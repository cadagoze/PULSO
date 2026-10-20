"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExercisePicker } from "@/components/exercises/exercise-picker";
import { beep, primeAudio, speak, useWakeLock, vibrate, voiceOn } from "@/lib/feedback";
import { addSwap, forgetSwaps } from "@/lib/adaptation";
import { effortFor, exerciseBests, progressedSets } from "@/lib/progression";
import type { EffortContext, ExerciseBests } from "@/lib/progression";
import { markProgramSession } from "@/lib/programs";
import { useDraft, useProgram, useSettings, useWorkouts } from "@/lib/store";
import { completedSets, exerciseById, lastRecordFor, recordHeading, recordsVolume, sessionSets, setHeading, warmupCount } from "@/lib/training";
import { useNow } from "@/lib/use-now";
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
import { adjustedRest, markSet, movedRecords, patchSet, restAfterSet, togglePaused, withExtraSet, withoutLastSet, withWarmups } from "./session-actions";
import { SessionHead } from "./session-head";
import { SessionHero } from "./session-hero";
import { prefersReducedMotion, SessionScreen } from "./session-screen";
import { SessionSheet } from "./session-sheet";
import { SetBlock } from "./set-block";
import type { SetMode } from "./set-block";
import { buildWorkoutEntry, firstPendingRecord, nextExerciseAfter, normalizeGroups, setBadge, sourceLabel, supersetLetters, toggleSuperset, validateSet, volumeLabel } from "./session-utils";
import type { Effort } from "./session-utils";
import { useHydrated } from "./use-hydrated";
import { useCountdownCues } from "./use-countdown-cues";
import { clearFinishRequest, finishRequestPending } from "@/components/session/draft-controls";
import { confirmAction } from "@/lib/confirm";

type SetCountdown = { recordIndex: number; setIndex: number; until: number };
type Picker = { mode: "add" } | { mode: "replace"; index: number };
type SetRef = { recordIndex: number; setIndex: number };
type MenuState = { index: number | null; open: boolean; session: boolean; view?: MenuView };

/** Tiempo (ms) que la serie recién completada queda en lima con su check antes de pasar a la siguiente. */
const HOLD_MS = 650;

/**
 * Pantalla de registro, siempre en modo inmersivo oscuro: estado vacío o sesión activa. Al guardar se
 * vuelve a Inicio, donde la portada muestra «Hecho hoy» y la semana suma la sesión.
 */
export function SessionLogger() {
  const hydrated = useHydrated();
  const router = useRouter();
  const [draft, setDraft] = useDraft();
  const [settings] = useSettings();
  const [leaving, setLeaving] = useState(false);

  function saved() {
    setLeaving(true);
    router.replace("/");
  }

  let content;
  if (!hydrated || leaving) content = <SessionSkeleton />;
  else if (!draft) content = <NoSession />;
  else content = <ActiveSession draft={draft} setDraft={setDraft} settings={settings} onSaved={saved} />;
  return <SessionScreen>{content}</SessionScreen>;
}

/** Avisos del temporizador por serie (ejercicios por tiempo). No pinta nada. */
function CountdownWatcher({ countdown, sound, voice, vibration }: { countdown: SetCountdown; sound: boolean; voice: boolean; vibration: boolean }) {
  const now = useNow(250);
  useCountdownCues({
    key: `${countdown.recordIndex}-${countdown.setIndex}-${countdown.until}`,
    remainingMs: countdown.until - now,
    now,
    onTen: () => {
      if (voice) speak("Quedan 10 segundos");
    },
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
  onSaved: () => void;
}

function ActiveSession({ draft, setDraft, settings, onSaved }: ActiveSessionProps) {
  const [workouts, setWorkouts] = useWorkouts();
  const [, setProgram] = useProgram();
  const [, updateSettings] = useSettings();
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
    updateRecord(recordIndex, (record) => patchSet(record, setIndex, setPatch, options?.carryFrom));
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
    const records = markSet(current.records, recordIndex, setIndex, completing);
    const rest = completing ? restAfterSet(current, recordIndex, records, settingsRef.current.autoRest) : 0;
    const now = Date.now();
    patch((draftNow) => ({
      ...draftNow,
      ...(rest > 0 ? { restUntil: now + rest * 1000, restTotal: rest } : {}),
      records: markSet(draftNow.records, recordIndex, setIndex, completing),
    }));
    if (!completing) return;
    if (settingsRef.current.vibration) vibrate(30);
    if (settingsRef.current.sound) beep({ frequency: 1180, duration: 0.05 });
    setFocus(null);
    setJustDone({ recordIndex, setIndex, next: nextExerciseAfter(records, recordIndex) });
    // Última serie de la sesión: tras ver el check, se abre la hoja para guardar (así cuenta en tu semana).
    const progress = sessionSets(records);
    if (progress.done === progress.total) window.setTimeout(() => setFinishOpen(true), 900);
  }, [patch]);

  const onAddSet = useCallback((recordIndex: number) => {
    updateRecord(recordIndex, withExtraSet);
  }, [updateRecord]);

  const onRemoveSet = useCallback((recordIndex: number) => {
    updateRecord(recordIndex, withoutLastSet);
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
    patch((current) => togglePaused(current, now));
  }

  function adjustRest(delta: number) {
    const now = Date.now();
    patch((current) => adjustedRest(current, delta, now));
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

  function effortOf(exercise: Exercise) {
    return effortFor(workouts, exercise.id, draft.id);
  }

  function addExercises(items: Exercise[]) {
    const records = items.map<ExerciseRecord>((exercise) => ({
      exerciseId: exercise.id,
      unit: exercise.unit,
      sets: progressedSets(exercise, exercise.sets, lastFor(exercise), effortOf(exercise)),
    }));
    patch((current) => ({ ...current, records: [...current.records, ...records] }));
    if (records.length) showToast(records.length === 1 ? "Ejercicio agregado" : `${records.length} ejercicios agregados`);
  }

  function replaceExercise(position: number, exercise: Exercise) {
    // Lo que cambias seguido deja de proponerse en tus próximas sesiones.
    const previous = draftRef.current.records[position]?.exerciseId;
    if (previous !== undefined && previous !== exercise.id) updateSettings({ swappedOut: addSwap(settingsRef.current.swappedOut, previous) });
    updateRecord(position, (record) => {
      const replaced: ExerciseRecord = {
        exerciseId: exercise.id,
        unit: exercise.unit,
        sets: progressedSets(exercise, Math.max(1, record.sets.length), lastFor(exercise), effortOf(exercise)),
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
    const plan = withWarmups(record, exercise, settings.barWeight);
    closeMenu();
    if (!plan.planned) {
      showToast(plan.heaviest > 0 ? "Con esta carga no hacen falta series de aproximación" : "Anota primero tu carga de trabajo");
      return;
    }
    if (!plan.missing) {
      showToast("Ya completaste el calentamiento para esta carga");
      return;
    }
    updateRecord(position, (currentRecord) => withWarmups(currentRecord, exercise, settings.barWeight).record);
    setCountdown(null);
    setFocus(null);
    showToast(`${plan.missing} ${plan.missing === 1 ? "serie" : "series"} de calentamiento agregadas`);
  }

  function moveExercise(position: number, step: -1 | 1) {
    const target = position + step;
    closeMenu();
    if (target < 0 || target >= draft.records.length) return;
    patch((current) => ({ ...current, records: movedRecords(current.records, position, step) }));
    // La pantalla sigue mostrando el mismo ejercicio en su nueva posición.
    setCurrent((value) => (value === position ? target : value === target ? position : value));
    setCountdown(null);
    setFocus(null);
  }

  async function deleteExercise(position: number) {
    const exercise = exerciseById(draft.records[position]?.exerciseId ?? -1);
    if (!(await confirmAction({ title: "¿Quitar ejercicio?", message: `${exercise?.name ?? "Este ejercicio"} sale de la sesión de hoy.`, confirmLabel: "Quitar", danger: true }))) return;
    patch((current) => ({ ...current, records: normalizeGroups(current.records.filter((_, item) => item !== position)) }));
    setCurrent((value) => (value > position ? value - 1 : value));
    setCountdown(null);
    setError(null);
    setFocus(null);
    setJustDone(null);
    closeMenu();
  }

  async function discard() {
    if (!(await confirmAction({ title: "¿Descartar entrenamiento?", message: "Se perderán las series sin guardar. Tu historial no cambia.", confirmLabel: "Descartar", danger: true }))) return;
    setDraft(null);
  }

  function save(effort: Effort, feltPain: boolean, painAreas: WorkoutEntry["painAreas"] = []) {
    const current = draftRef.current;
    if (!completedSets(current.records)) return;
    const entry = buildWorkoutEntry(current, workouts, { effort, feltPain, painAreas }, Date.now());
    const stored = setWorkouts((items) => [entry, ...items.filter((item) => item.id !== entry.id)]);
    if (!stored) {
      // Sin espacio en el dispositivo: se conserva el borrador para no perder el entrenamiento.
      showToast("No se pudo guardar: el almacenamiento del dispositivo está lleno. Exporta un respaldo y libera espacio.");
      return;
    }
    const source = current.source;
    if (source?.type === "program") setProgram((progress) => markProgramSession(progress, source.programId, source.week, source.day));
    // Lo que completaste ya no cuenta como «lo cambias seguido».
    const swaps = forgetSwaps(settingsRef.current.swappedOut, entry.records?.map((record) => record.exerciseId) ?? []);
    if (swaps !== settingsRef.current.swappedOut) updateSettings({ swappedOut: swaps });
    setFinishOpen(false);
    onSaved();
    setDraft(null);
  }

  function openMenu(position: number | null, options: { session?: boolean; view?: MenuView } = {}) {
    setMenu({ index: position, open: true, session: Boolean(options.session), view: options.view });
  }

  function closeMenu() {
    setMenu((value) => ({ ...value, open: false }));
  }

  // ─── Datos derivados ─────────────────────────────────────────────────
  const { done, total } = sessionSets(draft.records);
  const volume = volumeLabel(recordsVolume(draft.records), unit);
  const letters = useMemo(() => supersetLetters(draft.records), [draft.records]);
  const exerciseIds = draft.records.map((record) => record.exerciseId).join(",");
  const history = useMemo(() => {
    const map = new Map<number, { last?: ExerciseRecord; bests: ExerciseBests; effort: EffortContext }>();
    for (const id of exerciseIds.split(",").filter(Boolean).map(Number)) {
      map.set(id, { last: lastRecordFor(workouts, id, draft.id), bests: exerciseBests(workouts, id, draft.id), effort: effortFor(workouts, id, draft.id) });
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

  // Lo que viene tras el descanso, para el anillo: la serie siguiente o el siguiente ejercicio (en el
  // calentamiento, cada paso es un ejercicio distinto: va su nombre).
  const upcomingIndex = justDone ? justDone.next : index;
  const upcomingRecord = draft.records[upcomingIndex];
  const upcomingSet = upcomingRecord ? upcomingRecord.sets.findIndex((set) => !set.done) : -1;
  const upcoming = !upcomingRecord || upcomingSet < 0 ? undefined
    : upcomingIndex !== index || upcomingIndex < warmupCount(draft.records) ? exerciseById(upcomingRecord.exerciseId)?.name : setHeading(upcomingRecord.sets, upcomingSet);

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
        onTechnique={record && exercise ? () => openMenu(index, { view: "technique" }) : undefined}
        topBar={(
          <SessionTopBar
            draft={draft}
            current={index}
            onTogglePause={togglePause}
            onOpenMenu={() => openMenu(record && exercise ? index : null, { session: true })}
          />
        )}
        overlay={record ? (ringSize) => (
          <RestOverlay
            restUntil={draft.restUntil}
            restTotal={draft.restTotal ?? draft.restSeconds}
            sound={settings.sound}
            voice={voiceOn(settings)}
            vibration={settings.vibration}
            size={ringSize}
            upcoming={upcoming}
          />
        ) : undefined}
      />

      <div className="ses-panel">
        {record && exercise ? (
          <SessionHead
            key={`head-${index}-${record.exerciseId}`}
            exercise={exercise}
            record={record}
            superset={record.group ? letters.get(record.group) : undefined}
            fromPrev={direction < 0}
            onTechnique={() => openMenu(index, { view: "technique" })}
          />
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
            heading={index < warmupCount(draft.records) && setIndex >= 0 ? recordHeading(draft.records, index, setIndex) : undefined}
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
          upcoming={upcoming}
        />

        {record && exercise && (
          <ExerciseSets
            key={`sets-${index}-${record.exerciseId}`}
            recordIndex={index}
            record={record}
            exercise={exercise}
            last={info?.last}
            effort={info?.effort}
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

      {countdown && <CountdownWatcher countdown={countdown} sound={settings.sound} voice={voiceOn(settings)} vibration={settings.vibration} />}

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

      <FinishSheet open={finishOpen} onClose={() => setFinishOpen(false)} draft={draft} workouts={workouts} unit={unit} onSave={save} />

      {toast && <div className="toast ses-toast" role="status">{toast}</div>}
    </div>
  );
}
