"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { ArrowRight, Clock3, Layers, Play, SlidersHorizontal } from "lucide-react";
import { MuscleMap } from "@/components/ui/muscle-map";
import { ProgressBar } from "@/components/ui";
import { muscleRecovery } from "@/lib/analytics";
import { estimateMinutes, focusLabels, generateWorkout, goalFromProfile, levelFromActivities, suggestedFocus } from "@/lib/generator";
import { nextProgramSession, programById, programSessionName, programSessionRecords } from "@/lib/programs";
import { useStartWorkout } from "@/lib/session";
import { useDraft, usePreference, useProfile, useProgram, useWorkouts } from "@/lib/store";
import { completedSets, exerciseById, totalSets } from "@/lib/training";
import { dayOfYear, profileLimitations } from "./helpers";
import type { ExerciseRecord, MuscleGroup, ReadinessEntry } from "@/types";

const HOUR = 3_600_000;

/** Músculos principales y secundarios trabajados por una lista de ejercicios. */
function targetedMuscles(records: ExerciseRecord[]) {
  const primary = new Set<MuscleGroup>();
  const secondary = new Set<MuscleGroup>();
  for (const record of records) {
    const exercise = exerciseById(record.exerciseId);
    if (!exercise) continue;
    exercise.primary.forEach((muscle) => primary.add(muscle));
    exercise.secondary.forEach((muscle) => secondary.add(muscle));
  }
  primary.forEach((muscle) => secondary.delete(muscle));
  return { primary: [...primary], secondary: [...secondary] };
}

export function TodayHero({ now, readiness }: { now: number; readiness?: ReadinessEntry["recommendation"] }) {
  const [draft] = useDraft();
  const [progress] = useProgram();
  const [workouts] = useWorkouts();
  const [profile] = useProfile();
  const [preference] = usePreference();
  const start = useStartWorkout();

  const program = progress ? programById(progress.programId) : undefined;
  const next = program && progress ? nextProgramSession(program, progress) : null;
  const hourNow = Math.floor(now / HOUR) * HOUR;
  const seed = dayOfYear(now);
  const minutes = profile?.recommendation.sessionMinutes ?? 30;
  const activities = profile?.activities;
  const goals = profile?.goals;
  const limitations = profile?.limitations;

  const programRecords = useMemo(
    () => (program && next ? programSessionRecords(program, next.week, next.day, workouts) : []),
    [program, next, workouts],
  );

  const generated = useMemo(() => {
    if (hourNow === 0) return null;
    const recovery = muscleRecovery(workouts, hourNow);
    return generateWorkout({
      preference,
      minutes,
      focus: suggestedFocus(recovery, readiness),
      goal: goalFromProfile(goals),
      level: levelFromActivities(activities),
      limitations: profileLimitations(limitations),
      readiness,
      recovery,
      workouts,
      seed,
    });
  }, [activities, goals, hourNow, limitations, minutes, preference, readiness, seed, workouts]);

  if (draft) {
    const done = completedSets(draft.records);
    const total = totalSets(draft.records);
    return (
      <HeroFrame eyebrow="Entrenamiento en curso" title={draft.name} live>
        <p className="home-hero-lead">
          Llevas <b className="num">{done}</b> de <b className="num">{total}</b> series. Retoma donde quedaste.
        </p>
        <ProgressBar value={total ? (done / total) * 100 : 0} label="Series completadas" />
        <div className="home-hero-actions">
          <Link href="/entrenar/sesion" className="btn btn-primary">
            <Play size={17} />
            Continuar entrenamiento
          </Link>
        </div>
      </HeroFrame>
    );
  }

  if (program && next) {
    const day = program.days[next.day - 1];
    const note = program.weekNotes[next.week - 1];
    const name = programSessionName(program, next.week, next.day);
    return (
      <HeroFrame
        eyebrow={`Tu programa · Semana ${next.week} de ${program.weeks}`}
        title={day ? `${day.name} · ${day.focus}` : name}
        kicker={program.name}
      >
        <HeroBody
          records={programRecords}
          minutes={program.minutes}
          notes={[
            ...(note ? [note] : []),
            ...(readiness && readiness !== "planned" ? ["Tu chequeo sugiere bajar el ritmo: puedes quitar una serie por ejercicio."] : []),
          ]}
        />
        <div className="home-hero-actions">
          <button
            className="btn btn-primary"
            disabled={!programRecords.length}
            onClick={() => start({ name, records: programRecords, source: { type: "program", programId: program.id, week: next.week, day: next.day } })}
          >
            <Play size={17} />
            Comenzar
          </button>
          <Link href="/entrenar" className="btn home-hero-ghost">
            <SlidersHorizontal size={16} />
            Ver programa
          </Link>
        </div>
      </HeroFrame>
    );
  }

  if (!generated) {
    return (
      <HeroFrame eyebrow="Tu sesión de hoy" title="Preparando tu sesión…">
        <div className="home-hero-skeleton" aria-hidden="true" />
      </HeroFrame>
    );
  }

  return (
    <HeroFrame eyebrow={`Sugerido para hoy · ${focusLabels[generated.focus]}`} title={generated.name}>
      <HeroBody
        records={generated.records}
        minutes={generated.estimatedMinutes || estimateMinutes(generated.records, generated.restSeconds)}
        notes={generated.notes}
      />
      <div className="home-hero-actions">
        <button
          className="btn btn-primary"
          disabled={!generated.records.length}
          onClick={() => start({ name: generated.name, records: generated.records, restSeconds: generated.restSeconds, source: { type: "generated" } })}
        >
          <Play size={17} />
          Comenzar
        </button>
        <Link href="/entrenar" className="btn home-hero-ghost">
          <SlidersHorizontal size={16} />
          Personalizar
        </Link>
      </div>
    </HeroFrame>
  );
}

function HeroFrame({ eyebrow, title, kicker, live = false, children }: { eyebrow: string; title: string; kicker?: string; live?: boolean; children: ReactNode }) {
  return (
    <section className="card card-forest home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero-head">
        <p className="eyebrow">
          {live && <span className="home-live-dot" aria-hidden="true" />}
          {eyebrow}
        </p>
        {kicker && <p className="home-hero-kicker">{kicker}</p>}
        <h2 id="home-hero-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function HeroBody({ records, minutes, notes }: { records: ExerciseRecord[]; minutes: number; notes: string[] }) {
  const names = records.map((record) => exerciseById(record.exerciseId)?.name).filter((name): name is string => Boolean(name));
  const muscles = targetedMuscles(records);
  const sets = records.reduce((sum, record) => sum + record.sets.length, 0);
  return (
    <div className="home-hero-body">
      <div className="home-hero-info">
        <ul className="home-hero-meta">
          <li>
            <Clock3 size={15} />
            <span className="num">~{minutes}</span> min
          </li>
          <li>
            <Layers size={15} />
            <span className="num">{records.length}</span> ejercicios
          </li>
          <li>
            <span className="num">{sets}</span> series
          </li>
        </ul>
        <ol className="home-hero-list">
          {names.slice(0, 3).map((name, index) => (
            <li key={`${name}-${index}`}>
              <span className="num">{String(index + 1).padStart(2, "0")}</span>
              {name}
            </li>
          ))}
          {names.length > 3 && (
            <li className="home-hero-more">
              <ArrowRight size={14} />
              +{names.length - 3} más
            </li>
          )}
        </ol>
        {notes.length > 0 && (
          <ul className="home-hero-notes">
            {notes.slice(0, 2).map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="home-hero-map">
        <MuscleMap primary={muscles.primary} secondary={muscles.secondary} captions={false} label="Músculos que trabajarás hoy" />
      </div>
    </div>
  );
}
