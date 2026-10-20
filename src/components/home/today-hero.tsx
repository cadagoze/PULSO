"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "@/components/ui/app-link";
import { ChartNoAxesColumn, Check, Pause, Play, SlidersHorizontal, Square, StretchHorizontal } from "lucide-react";
import { DraftEndSheet, requestFinish, useDraftControls } from "@/components/session/draft-controls";
import { RestStatus } from "@/components/session/rest-away";
import { useProgramActions } from "@/components/train/program-actions";
import { useActiveProgram, useTodayPlan } from "@/components/train/today-plan";
import { ButtonLink, Button, MetaLine, ProgressBar } from "@/components/ui";
import { PhotoCard } from "@/components/ui/cards";
import { zoneById } from "@/data/body-zones";
import { heroKind, heroPhoto, type HeroPhoto } from "@/data/hero-photos";
import { focusLabels, goalLabels } from "@/lib/generator";
import { programSessionName } from "@/lib/programs";
import { painNote } from "@/lib/readiness";
import { useStartMobility, useStartWorkout } from "@/lib/session";
import { useDraft, usePreference, useWorkouts } from "@/lib/store";
import { sessionSets } from "@/lib/training";
import { usePersonalization } from "@/lib/use-personalize";
import { useRestDay } from "@/lib/use-rest-day";
import { localDateKey, localDaySeed } from "@/lib/utils";

/**
 * Lo que toca hoy como portada: la misma sesión que Entrenar (calentamiento incluido), con un solo
 * botón para empezar. También cubre el entrenamiento a medias, el día de descanso y el ya hecho.
 */
export function TodayHero({ now }: { now: number }) {
  const [draft] = useDraft();
  const [workouts] = useWorkouts();
  const [preference] = usePreference();
  const today = useTodayPlan(now);
  const active = useActiveProgram(now);
  const { startSession } = useProgramActions();
  const start = useStartWorkout();
  const startMobility = useStartMobility();
  const restDay = useRestDay();
  const { audience } = usePersonalization();
  const seed = localDaySeed(now);
  const place = preference.location === "gym" ? "Gimnasio" : "Casa";
  const recommendation = today.readiness?.recommendation;
  const pain = today.readiness?.pain;
  const doneToday = workouts.filter((workout) => workout.date === localDateKey(new Date(now)));

  if (draft) {
    const { done, total } = sessionSets(draft.records);
    // Todas las series hechas pero sin guardar: no cuenta en tu semana hasta guardarlo.
    const ready = total > 0 && done === total;
    return (
      <HeroFrame
        photo={heroPhoto("home", seed, audience)}
        tag={ready ? <><Check size={13} strokeWidth={3} aria-hidden="true" />Listo para guardar</> : <><span className="home-live-dot" aria-hidden="true" />En curso</>}
        meta={ready ? "Entrenamiento completo" : "Entrenamiento a medias"}
        title={draft.name}
      >
        <div className="home-hero-progress">
          <MetaLine items={[<><b className="num">{done}</b> de <b className="num">{total}</b> series</>, ready ? "Sin guardar" : draft.runningSince === null ? "En pausa" : <RestStatus key="rest" restUntil={draft.restUntil} fallback="Reloj en marcha" />]} />
          <ProgressBar value={total ? (done / total) * 100 : 0} label="Series completadas" />
        </div>
        {ready
          ? <ButtonLink href="/entrenar/sesion?terminar=1" size="l" block onClick={requestFinish}><Check size={18} />Guardar entrenamiento</ButtonLink>
          : <ButtonLink href="/entrenar/sesion" size="l" block><Play size={18} fill="currentColor" />Continuar entrenamiento</ButtonLink>}
        <DraftButtons />
      </HeroFrame>
    );
  }

  // Ya entrenaste hoy: la portada lo celebra y lleva a tu progreso; entrenar otra vez queda a un toque.
  if (doneToday.length) {
    const last = doneToday.reduce((latest, workout) => ((workout.completedAt ?? "") > (latest.completedAt ?? "") ? workout : latest));
    return (
      <HeroFrame photo={heroPhoto("mobility", seed, audience)} tag={<><Check size={13} strokeWidth={3} aria-hidden="true" />Hecho hoy</>} meta="Entrenamiento completado" title={(last.name ?? "Entrenamiento").replace(/ · \d+ min$/, "")}>
        <MetaLine className="home-hero-details" items={[<><b className="num">{Math.round(last.durationMinutes)}</b> min</>, <><b className="num">{last.sets}</b> series</>, last.prs?.length ? <><b className="num">{last.prs.length}</b> {last.prs.length === 1 ? "récord" : "récords"}</> : null, doneToday.length > 1 ? `${doneToday.length} sesiones hoy` : null]} />
        <div className="home-hero-actions home-hero-rest">
          <ButtonLink href="/progreso" size="l" block><ChartNoAxesColumn size={18} />Ver mi progreso</ButtonLink>
          <Link href="/entrenar" className="home-hero-anyway">o entrena otra vez</Link>
        </div>
      </HeroFrame>
    );
  }

  if (active?.next) {
    const { program, next, day, records } = active;
    const recovering = recommendation === "recovery";
    const programPlace = program.location === "any" ? place : program.location === "gym" ? "Gimnasio" : "Casa";
    const note = pain?.length
      ? "Con molestias, versión corta. Si un ejercicio molesta, cámbialo desde su menú."
      : recommendation === "short" ? "Versión corta por tu chequeo: una serie menos por ejercicio."
        : recovering ? "Tu cuerpo pide recuperar: hoy, mejor movilidad." : undefined;
    return (
      <HeroFrame
        photo={heroPhoto(restDay || recovering ? "mobility" : heroKind({ programGoal: program.goal, location: program.location === "any" ? preference.location : program.location }), seed, audience)}
        tag={restDay ? "Día de descanso" : `Semana ${next.week} de ${program.weeks}`}
        meta={program.name}
        title={day ? `${day.name} · ${day.focus}` : programSessionName(program, next.week, next.day)}
        note={note}
      >
        <Details count={records.length} minutes={program.minutes} place={programPlace} />
        <Actions
          disabled={!records.length}
          onStart={() => void startSession(program, next.week, next.day, { easier: recommendation === "short" || Boolean(pain?.length) })}
          rest={restDay || recovering ? () => void startMobility() : undefined}
        />
      </HeroFrame>
    );
  }

  if (!today.ready) {
    return (
      <HeroFrame photo={heroPhoto("home", seed, audience)} tag="Hoy" meta="Preparando" title="Armando tu sesión…">
        <div className="home-hero-skeleton" aria-hidden="true" />
      </HeroFrame>
    );
  }

  return (
    <HeroFrame
      photo={heroPhoto(restDay ? "mobility" : heroKind({ focus: today.focus, location: preference.location }), seed, audience)}
      tag={restDay ? "Día de descanso" : "Hoy"}
      meta={goalLabels[today.goal]}
      title={zoneById(today.zone)?.label ?? focusLabels[today.focus]}
      note={painNote(pain) ?? (recommendation && recommendation !== "planned" ? today.plan?.notes[0] : undefined)}
    >
      <Details count={today.records.length} minutes={today.estimated} place={place} />
      <Actions
        disabled={!today.records.length}
        onStart={() => void start({ name: today.name, records: today.fullRecords, restSeconds: today.restSeconds, source: { type: "generated" } })}
        rest={restDay ? () => void startMobility() : undefined}
      />
    </HeroFrame>
  );
}

function HeroFrame({ photo, tag, meta, title, note, children }: { photo: HeroPhoto; tag: ReactNode; meta: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-labelledby="home-hero-title">
      <PhotoCard photo={photo} priority tag={tag} className="home-hero" sizes="(max-width: 960px) 100vw, 640px">
        <div className="home-hero-head">
          <p className="meta home-hero-meta">{meta}</p>
          <h2 id="home-hero-title" className="home-hero-title">{title}</h2>
          {note && <p className="home-hero-note">{note}</p>}
        </div>
        {children}
      </PhotoCard>
    </section>
  );
}

function Details({ count, minutes, place }: { count: number; minutes: number; place: string }) {
  return (
    <MetaLine
      className="home-hero-details"
      items={[
        <><b className="num">{count}</b> {count === 1 ? "ejercicio" : "ejercicios"}</>,
        <><b className="num">{minutes}</b> min</>,
        place,
      ]}
    />
  );
}

function Actions({ disabled, onStart, rest }: { disabled: boolean; onStart: () => void; rest?: () => void }) {
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
      <Button size="l" block disabled={disabled} onClick={onStart}><Play size={18} fill="currentColor" />Empezar entrenamiento</Button>
      <ButtonLink href="/entrenar" variant="glass" size="l" className="home-hero-more" aria-label="Ajustar entrenamiento" title="Ajustar entrenamiento">
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
