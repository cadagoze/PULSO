"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, Flame, Pause, Play, SlidersHorizontal, Square, StretchHorizontal } from "lucide-react";
import { DraftEndSheet, requestFinish, useDraftControls } from "@/components/session/draft-controls";
import { ButtonLink, Button, MetaLine, ProgressBar } from "@/components/ui";
import { PhotoCard } from "@/components/ui/cards";
import { muscleRecovery } from "@/lib/analytics";
import { estimateMinutes, focusLabels, generateWorkout, todayGeneratorInput } from "@/lib/generator";
import { nextProgramSession, programById, programSessionName, programSessionRecords } from "@/lib/programs";
import { useStartMobility, useStartWorkout } from "@/lib/session";
import { useDraft, useNutritionProfile, usePreference, useProfile, useProgram, useSettings, useWorkouts } from "@/lib/store";
import { completedSets, totalSets } from "@/lib/training";
import { heroKind, heroPhoto, type HeroPhoto } from "@/data/hero-photos";
import { heroLine } from "@/lib/motivation";
import { usePersonalization } from "@/lib/use-personalize";
import { useLatestWeight } from "@/lib/use-nutrition";
import { isRestDay, nextTrainingDay } from "@/lib/training-days";
import { localDateKey, localDaySeed } from "@/lib/utils";
import type { ExerciseRecord, ReadinessEntry } from "@/types";

const HOUR = 3_600_000;

/** La sesión de hoy como portada: fotografía, nombre, datos clave y el botón para empezar. */
export function TodayHero({ now, readiness }: { now: number; readiness?: ReadinessEntry["recommendation"] }) {
  const [draft] = useDraft();
  const [progress] = useProgram();
  const [workouts] = useWorkouts();
  const [profile] = useProfile();
  const [nutrition] = useNutritionProfile();
  const bodyKg = useLatestWeight();
  const [preference] = usePreference();
  const [settings] = useSettings();
  const start = useStartWorkout();
  const seed = localDaySeed(now);
  const { audience } = usePersonalization();
  const motivation = (minutes: number) => heroLine({ workouts, weeklyGoal: settings.weeklyGoal, pausedWeeks: settings.pausedWeeks, minutes, now: new Date(now) });

  const program = progress ? programById(progress.programId) : undefined;
  const next = program && progress ? nextProgramSession(program, progress) : null;
  const hourNow = Math.floor(now / HOUR) * HOUR;
  const place = preference.location === "gym" ? "Gimnasio" : "Casa";
  const easier = readiness && readiness !== "planned";
  const startMobility = useStartMobility();
  // Día de descanso (con días fijos y sin entrenar aún hoy): se propone movilidad y se puede entrenar igual.
  const date = new Date(now);
  const restDay = isRestDay(settings.trainingDays, date) && !workouts.some((workout) => workout.date === localDateKey(date));
  const upcoming = nextTrainingDay(settings.trainingDays, date);
  const restLine = upcoming ? `Hoy se recupera. ${upcoming.ahead === 1 ? "Mañana" : `El ${upcoming.label}`} se entrena.` : "Hoy se recupera.";
  const rest = restDay ? () => void startMobility() : undefined;

  const programRecords = useMemo(
    () => (program && next ? programSessionRecords(program, next.week, next.day, workouts) : []),
    [program, next, workouts],
  );

  // Misma sesión que Entrenar: las entradas del generador vienen de un solo lugar.
  const generated = useMemo(() => {
    if (hourNow === 0) return null;
    const recovery = muscleRecovery(workouts, hourNow);
    return generateWorkout(todayGeneratorInput({ profile, nutritionGoal: nutrition?.goal, preference, workouts, readiness, recovery, now, bodyKg }));
  }, [bodyKg, hourNow, now, nutrition?.goal, preference, profile, readiness, workouts]);

  if (draft) {
    const done = completedSets(draft.records);
    const total = totalSets(draft.records);
    // Todas las series hechas pero sin guardar: no cuenta en tu semana hasta guardarlo.
    const ready = total > 0 && done === total;
    return (
      <HeroFrame
        photo={heroPhoto("home", seed, audience)}
        tag={ready ? <><Check size={13} strokeWidth={3} aria-hidden="true" />Listo para guardar</> : <><span className="home-live-dot" aria-hidden="true" />En curso</>}
        meta={ready ? "Entrenamiento completo" : "Entrenamiento a medias"}
        title={draft.name}
        line={ready ? "Guárdalo para que cuente en tu semana." : undefined}
      >
        <div className="home-hero-progress">
          <MetaLine items={[<><b className="num">{done}</b> de <b className="num">{total}</b> series</>, ready ? "Sin guardar" : draft.runningSince === null ? "En pausa" : "Reloj en marcha"]} />
          <ProgressBar value={total ? (done / total) * 100 : 0} label="Series completadas" />
        </div>
        {ready
          ? <ButtonLink href="/entrenar/sesion?terminar=1" size="l" block onClick={requestFinish}><Check size={18} />Guardar entrenamiento</ButtonLink>
          : <ButtonLink href="/entrenar/sesion" size="l" block><Play size={18} fill="currentColor" />Continuar entrenamiento</ButtonLink>}
        <DraftButtons />
      </HeroFrame>
    );
  }

  if (program && next) {
    const day = program.days[next.day - 1];
    const name = programSessionName(program, next.week, next.day);
    return (
      <HeroFrame
        photo={heroPhoto(restDay ? "mobility" : heroKind({ programGoal: program.goal, location: program.location === "any" ? preference.location : program.location }), seed, audience)}
        line={restDay ? restLine : motivation(program.minutes)}
        tag={restDay ? "Día de descanso" : `Semana ${next.week} de ${program.weeks}`}
        meta={program.name}
        title={day ? `${day.name} · ${day.focus}` : name}
        note={easier ? "Tu chequeo sugiere bajar el ritmo: puedes quitar una serie por ejercicio." : undefined}
      >
        <Details records={programRecords} minutes={program.minutes} place={place} />
        <Actions
          disabled={!programRecords.length}
          onStart={() => start({ name, records: programRecords, source: { type: "program", programId: program.id, week: next.week, day: next.day } })}
          secondaryLabel="Ver programa"
          rest={rest}
        />
      </HeroFrame>
    );
  }

  if (!generated) {
    return (
      <HeroFrame photo={heroPhoto("home", seed, audience)} tag="Tu sesión de hoy" meta="Preparando" title="Armando tu sesión…">
        <div className="home-hero-skeleton" aria-hidden="true" />
      </HeroFrame>
    );
  }

  const minutes = generated.estimatedMinutes || estimateMinutes(generated.records, generated.restSeconds);
  return (
    <HeroFrame
      photo={heroPhoto(restDay ? "mobility" : heroKind({ focus: generated.focus, location: preference.location }), seed, audience)}
      line={restDay ? restLine : motivation(minutes)}
      tag={restDay ? "Día de descanso" : "Tu sesión de hoy"}
      meta={focusLabels[generated.focus]}
      title={generated.name}
      note={easier ? generated.notes[0] : undefined}
    >
      <Details records={generated.records} minutes={minutes} place={place} />
      <Actions
        disabled={!generated.records.length}
        onStart={() => start({ name: generated.name, records: generated.records, restSeconds: generated.restSeconds, source: { type: "generated" } })}
        secondaryLabel="Personalizar"
        rest={rest}
      />
    </HeroFrame>
  );
}

function HeroFrame({ photo, line, tag, meta, title, note, children }: { photo: HeroPhoto; line?: string; tag: ReactNode; meta: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-labelledby="home-hero-title">
      <PhotoCard photo={photo} priority tag={tag} className="home-hero" sizes="(max-width: 960px) 100vw, 640px">
        <div className="home-hero-head">
          {line && <p className="home-hero-line"><Flame size={15} aria-hidden="true" />{line}</p>}
          <p className="meta home-hero-meta">{meta}</p>
          <h2 id="home-hero-title" className="home-hero-title">{title}</h2>
          {note && <p className="home-hero-note">{note}</p>}
        </div>
        {children}
      </PhotoCard>
    </section>
  );
}

function Details({ records, minutes, place }: { records: ExerciseRecord[]; minutes: number; place: string }) {
  return (
    <MetaLine
      className="home-hero-details"
      items={[
        <><b className="num">{records.length}</b> ejercicios</>,
        <><b className="num">{minutes}</b> min</>,
        place,
      ]}
    />
  );
}

function Actions({ disabled, onStart, secondaryLabel, rest }: { disabled: boolean; onStart: () => void; secondaryLabel: string; rest?: () => void }) {
  if (rest) {
    return (
      <div className="home-hero-actions home-hero-rest">
        <Button size="l" block onClick={rest}><StretchHorizontal size={18} />Movilidad 10 min</Button>
        <button type="button" className="home-hero-anyway" disabled={disabled} onClick={onStart}>o entrena igual</button>
      </div>
    );
  }
  return (
    <div className="home-hero-actions">
      <Button size="l" block disabled={disabled} onClick={onStart}><Play size={18} fill="currentColor" />Empezar ahora</Button>
      <ButtonLink href="/entrenar" variant="glass" size="l" className="home-hero-more" aria-label={secondaryLabel} title={secondaryLabel}>
        <SlidersHorizontal size={19} />
      </ButtonLink>
    </div>
  );
}

/** Pausar o reanudar el reloj y terminar o descartar, sin entrar a la sesión. */
function DraftButtons() {
  const { paused, togglePause } = useDraftControls();
  const [ending, setEnding] = useState(false);
  return (
    <div className="home-hero-draft">
      <Button variant="glass" onClick={togglePause}>{paused ? <><Play size={16} fill="currentColor" />Reanudar</> : <><Pause size={16} fill="currentColor" />Pausar</>}</Button>
      <Button variant="glass" onClick={() => setEnding(true)}><Square size={14} fill="currentColor" />Terminar o descartar</Button>
      <DraftEndSheet open={ending} onClose={() => setEnding(false)} />
    </div>
  );
}
