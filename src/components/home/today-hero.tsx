"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { Play, SlidersHorizontal } from "lucide-react";
import { ButtonLink, Button, MetaLine, ProgressBar } from "@/components/ui";
import { PhotoCard } from "@/components/ui/cards";
import { muscleRecovery } from "@/lib/analytics";
import { estimateMinutes, focusLabels, generateWorkout, todayGeneratorInput } from "@/lib/generator";
import { nextProgramSession, programById, programSessionName, programSessionRecords } from "@/lib/programs";
import { useStartWorkout } from "@/lib/session";
import { useDraft, useNutritionProfile, usePreference, useProfile, useProgram, useWorkouts } from "@/lib/store";
import { completedSets, totalSets } from "@/lib/training";
import type { ExerciseRecord, ReadinessEntry } from "@/types";

const HOUR = 3_600_000;
const photo = { src: "/images/editorial/home-squat.webp", alt: "Persona haciendo una sentadilla en su sala, con luz natural", position: "66% 38%" };

/** La sesión de hoy como portada: fotografía, nombre, datos clave y el botón para empezar. */
export function TodayHero({ now, readiness }: { now: number; readiness?: ReadinessEntry["recommendation"] }) {
  const [draft] = useDraft();
  const [progress] = useProgram();
  const [workouts] = useWorkouts();
  const [profile] = useProfile();
  const [nutrition] = useNutritionProfile();
  const [preference] = usePreference();
  const start = useStartWorkout();

  const program = progress ? programById(progress.programId) : undefined;
  const next = program && progress ? nextProgramSession(program, progress) : null;
  const hourNow = Math.floor(now / HOUR) * HOUR;
  const place = preference.location === "gym" ? "Gimnasio" : "Casa";
  const easier = readiness && readiness !== "planned";

  const programRecords = useMemo(
    () => (program && next ? programSessionRecords(program, next.week, next.day, workouts) : []),
    [program, next, workouts],
  );

  // Misma sesión que Entrenar: las entradas del generador vienen de un solo lugar.
  const generated = useMemo(() => {
    if (hourNow === 0) return null;
    const recovery = muscleRecovery(workouts, hourNow);
    return generateWorkout(todayGeneratorInput({ profile, nutritionGoal: nutrition?.goal, preference, workouts, readiness, recovery, now }));
  }, [hourNow, now, nutrition?.goal, preference, profile, readiness, workouts]);

  if (draft) {
    const done = completedSets(draft.records);
    const total = totalSets(draft.records);
    return (
      <HeroFrame tag={<><span className="home-live-dot" aria-hidden="true" />En curso</>} meta="Entrenamiento a medias" title={draft.name}>
        <div className="home-hero-progress">
          <MetaLine items={[<><b className="num">{done}</b> de <b className="num">{total}</b> series</>, draft.runningSince === null ? "En pausa" : "Reloj en marcha"]} />
          <ProgressBar value={total ? (done / total) * 100 : 0} label="Series completadas" />
        </div>
        <ButtonLink href="/entrenar/sesion" size="l" block><Play size={18} fill="currentColor" />Continuar entrenamiento</ButtonLink>
      </HeroFrame>
    );
  }

  if (program && next) {
    const day = program.days[next.day - 1];
    const name = programSessionName(program, next.week, next.day);
    return (
      <HeroFrame tag={`Semana ${next.week} de ${program.weeks}`} meta={program.name} title={day ? `${day.name} · ${day.focus}` : name} note={easier ? "Tu chequeo sugiere bajar el ritmo: puedes quitar una serie por ejercicio." : undefined}>
        <Details records={programRecords} minutes={program.minutes} place={place} />
        <Actions
          disabled={!programRecords.length}
          onStart={() => start({ name, records: programRecords, source: { type: "program", programId: program.id, week: next.week, day: next.day } })}
          secondaryLabel="Ver programa"
        />
      </HeroFrame>
    );
  }

  if (!generated) {
    return (
      <HeroFrame tag="Tu sesión de hoy" meta="Preparando" title="Armando tu sesión…">
        <div className="home-hero-skeleton" aria-hidden="true" />
      </HeroFrame>
    );
  }

  return (
    <HeroFrame tag="Tu sesión de hoy" meta={focusLabels[generated.focus]} title={generated.name} note={easier ? generated.notes[0] : undefined}>
      <Details records={generated.records} minutes={generated.estimatedMinutes || estimateMinutes(generated.records, generated.restSeconds)} place={place} />
      <Actions
        disabled={!generated.records.length}
        onStart={() => start({ name: generated.name, records: generated.records, restSeconds: generated.restSeconds, source: { type: "generated" } })}
        secondaryLabel="Personalizar"
      />
    </HeroFrame>
  );
}

function HeroFrame({ tag, meta, title, note, children }: { tag: ReactNode; meta: string; title: string; note?: string; children: ReactNode }) {
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

function Actions({ disabled, onStart, secondaryLabel }: { disabled: boolean; onStart: () => void; secondaryLabel: string }) {
  return (
    <div className="home-hero-actions">
      <Button size="l" block disabled={disabled} onClick={onStart}><Play size={18} fill="currentColor" />Iniciar entrenamiento</Button>
      <ButtonLink href="/entrenar" variant="glass" size="l" className="home-hero-more" aria-label={secondaryLabel} title={secondaryLabel}>
        <SlidersHorizontal size={19} />
      </ButtonLink>
    </div>
  );
}
