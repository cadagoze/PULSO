"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "@/components/ui/app-link";
import { ChartNoAxesColumn, Check, Pause, Play, SlidersHorizontal, Square, StretchHorizontal, Timer } from "lucide-react";
import type { HomeCoach } from "@/components/home/use-home-coach";
import { DraftEndSheet, requestFinish, useDraftControls } from "@/components/session/draft-controls";
import { RestStatus } from "@/components/session/rest-away";
import { useProgramActions } from "@/components/train/program-actions";
import { ButtonLink, Button, MetaLine, ProgressBar } from "@/components/ui";
import { PhotoCard } from "@/components/ui/cards";
import { zoneById } from "@/data/body-zones";
import { heroKind, heroPhoto, type HeroPhoto } from "@/data/hero-photos";
import type { DailyCoachResult } from "@/lib/daily-coach";
import { focusLabels, goalLabels } from "@/lib/generator";
import { programSessionName } from "@/lib/programs";
import { useStartMobility, useStartWorkout } from "@/lib/session";
import { SHORT_MINUTES } from "@/lib/short-session";
import { useDraft, usePreference, useWorkouts } from "@/lib/store";
import { durationSeconds, sessionSets } from "@/lib/training";
import { usePersonalization } from "@/lib/use-personalize";
import { cn, localDateKey, localDaySeed } from "@/lib/utils";

/**
 * «Hoy», la acción principal de Inicio: la sesión que toca (la misma de Entrenar, con calentamiento), la
 * recomendación del coach con su porqué y un solo botón. Un entrenamiento en curso va siempre primero;
 * también cubre el día ya entrenado, el de recuperar y la versión corta.
 */
export function TodayHero({ now, home }: { now: number; home: HomeCoach }) {
  const [draft] = useDraft();
  const [workouts] = useWorkouts();
  const [preference] = usePreference();
  const { today, active, coach, records, minutes } = home;
  const { startSession } = useProgramActions();
  const start = useStartWorkout();
  const startMobility = useStartMobility();
  const { audience } = usePersonalization();
  const seed = localDaySeed(now);
  const place = preference.location === "gym" ? "Gimnasio" : "Casa";

  if (draft) {
    const { done, total } = sessionSets(draft.records);
    // Todas las series hechas pero sin guardar: no cuenta en tu semana hasta guardarlo.
    const ready = total > 0 && done === total;
    return (
      <HeroFrame
        photo={heroPhoto("home", seed, audience)}
        tag={ready ? <><Check size={13} strokeWidth={3} aria-hidden="true" />Listo para guardar</> : <><span className="home-live-dot" aria-hidden="true" />En curso</>}
        meta={ready ? "Entrenamiento completo" : "Entrenamiento en curso"}
        title={draft.name.replace(/ · \d+ min$/, "")}
      >
        <div className="home-hero-progress">
          <MetaLine items={[<><b className="num">{Math.floor(durationSeconds(draft, now) / 60)}</b> min</>, <><b className="num">{done}/{total}</b> series</>, ready ? "Sin guardar" : draft.runningSince === null ? "En pausa" : <RestStatus key="rest" restUntil={draft.restUntil} fallback="Reloj en marcha" />]} />
          <ProgressBar value={total ? (done / total) * 100 : 0} label="Series completadas" />
        </div>
        {ready
          ? <ButtonLink href="/entrenar/sesion?terminar=1" size="l" block onClick={requestFinish}><Check size={18} />Guardar entrenamiento</ButtonLink>
          : <ButtonLink href="/entrenar/sesion" size="l" block><Play size={18} fill="currentColor" />Continuar</ButtonLink>}
        <DraftButtons />
      </HeroFrame>
    );
  }

  // Ya entrenaste hoy: la portada lo celebra y lleva a tu progreso; entrenar otra vez queda a un toque.
  const doneToday = workouts.filter((workout) => workout.date === localDateKey(new Date(now)));
  if (doneToday.length) {
    const last = doneToday.reduce((latest, workout) => ((workout.completedAt ?? "") > (latest.completedAt ?? "") ? workout : latest));
    return (
      <HeroFrame photo={heroPhoto("mobility", seed, audience)} tag={<><Check size={13} strokeWidth={3} aria-hidden="true" />Hecho hoy</>} meta="Entrenamiento completado" title={(last.name ?? "Entrenamiento").replace(/ · \d+ min$/, "")}>
        <MetaLine className="home-hero-details" items={[<><b className="num">{Math.round(last.durationMinutes)}</b> min</>, <><b className="num">{last.sets}</b> series</>, last.prs?.length ? <><b className="num">{last.prs.length}</b> {last.prs.length === 1 ? "récord" : "récords"}</> : null, doneToday.length > 1 ? `${doneToday.length} sesiones hoy` : null]} />
        <CoachLine coach={coach} />
        <div className="home-hero-actions home-hero-rest">
          <ButtonLink href="/progreso" size="l" block><ChartNoAxesColumn size={18} />Ver mi progreso</ButtonLink>
          <Link href="/entrenar" className="home-hero-anyway">o entrena otra vez</Link>
        </div>
      </HeroFrame>
    );
  }

  const program = home.source === "program" && active?.next ? active : null;
  if (!program && !today.ready) {
    return (
      <HeroFrame photo={heroPhoto("home", seed, audience)} tag="Hoy" meta="Preparando" title="Armando tu sesión…">
        <div className="home-hero-skeleton" aria-hidden="true" />
      </HeroFrame>
    );
  }

  const recovering = coach.recommendation === "recovery" || coach.recommendation === "mobility";
  const sessionTitle = program?.next
    ? program.day ? `${program.day.name} · ${program.day.focus}` : programSessionName(program.program, program.next.week, program.next.day)
    : zoneById(today.zone)?.label ?? focusLabels[today.focus];
  const sessionPlace = program && program.program.location !== "any" ? (program.program.location === "gym" ? "Gimnasio" : "Casa") : place;
  const begin = () => {
    if (program?.next) {
      void startSession(program.program, program.next.week, program.next.day, { easier: coach.recommendation === "train-reduced", short: today.short });
      return;
    }
    const name = today.short ? today.name.replace(/\d+ min$/, `${SHORT_MINUTES} min`) : today.name;
    void start({ name, records: today.fullRecords, restSeconds: today.restSeconds, source: { type: "generated" } });
  };
  const photoKind = recovering ? "mobility"
    : program ? heroKind({ programGoal: program.program.goal, location: program.program.location === "any" ? preference.location : program.program.location })
      : heroKind({ focus: today.focus, location: preference.location });

  return (
    <HeroFrame
      photo={heroPhoto(photoKind, seed, audience)}
      tag={recovering ? (coach.recommendation === "mobility" ? "Día de descanso" : "Recuperar") : program?.next ? `Semana ${program.next.week} de ${program.program.weeks}` : "Hoy"}
      meta={recovering ? "Recuperación" : program ? program.program.name : goalLabels[today.goal]}
      title={recovering ? "Movilidad suave" : sessionTitle}
    >
      {/* Al responder el chequeo o elegir la versión corta, la lectura cambia con un fundido breve. */}
      <div key={`${recovering}-${minutes}-${records.length}`} className="home-hero-swap">
        {recovering
          ? <MetaLine className="home-hero-details" items={[<><b className="num">10</b> min</>, "Sin equipamiento", "Suave"]} />
          : <MetaLine className="home-hero-details" items={[<><b className="num">{minutes}</b> min</>, sessionPlace, <><b className="num">{records.length}</b> {records.length === 1 ? "ejercicio" : "ejercicios"}</>]} />}
      </div>
      <CoachLine coach={coach} />
      {recovering ? (
        <div className="home-hero-actions home-hero-rest">
          <Button size="l" block onClick={() => void startMobility()}><StretchHorizontal size={18} />{coach.primaryAction}</Button>
          <button type="button" className="home-hero-anyway" disabled={!records.length} onClick={begin}>o entrena igual: {sessionTitle}</button>
        </div>
      ) : (
        <div className="home-hero-actions">
          <Button size="l" block disabled={!records.length} onClick={begin}><Play size={18} fill="currentColor" />{coach.primaryAction}</Button>
          <ButtonLink href="/entrenar" variant="glass" size="l" className="home-hero-more" aria-label="Ajustar entrenamiento" title="Ajustar entrenamiento">
            <SlidersHorizontal size={19} />
          </ButtonLink>
        </div>
      )}
      {home.canShorten && (
        <button type="button" className="home-short" aria-pressed={today.short} onClick={() => today.setShort(!today.short)}>
          <Timer size={15} aria-hidden="true" />
          {today.short
            ? <span>Volver a la sesión completa · <span className="num">{home.fullMinutes}</span> min</span>
            : <span>¿Poco tiempo? <b>Versión {SHORT_MINUTES} min</b></span>}
        </button>
      )}
    </HeroFrame>
  );
}

/** Lo que dice el coach: cómo llega el cuerpo y qué conviene («Recuperación buena. Hoy puedes entrenar normal.») y por qué. */
function CoachLine({ coach }: { coach: DailyCoachResult }) {
  return (
    <div className="home-coach" aria-live="polite">
      <div key={`${coach.recommendation}|${coach.status}|${coach.title}|${coach.reason}`} className="home-hero-swap">
        <p className="home-coach-title">
          <span className={cn("home-coach-dot", !coach.positive && "is-care")} aria-hidden="true" />
          <span><span className="home-coach-status">{coach.status}.</span> {coach.title}</span>
        </p>
        <p className="home-coach-reason">{coach.reason}</p>
      </div>
    </div>
  );
}

function HeroFrame({ photo, tag, meta, title, children }: { photo: HeroPhoto; tag: ReactNode; meta: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby="home-hero-title">
      <PhotoCard photo={photo} priority tag={tag} className="home-hero" sizes="(max-width: 960px) 100vw, 640px">
        <div className="home-hero-head">
          <p className="meta home-hero-meta">{meta}</p>
          <h2 id="home-hero-title" className="home-hero-title">{title}</h2>
        </div>
        {children}
      </PhotoCard>
    </section>
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
