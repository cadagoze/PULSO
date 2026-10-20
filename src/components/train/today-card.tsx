"use client";

import type { CSSProperties, ReactNode } from "react";
import { CalendarDays, Play, RotateCcw, SlidersHorizontal, StretchHorizontal } from "lucide-react";
import { Button, ButtonLink, MetaLine, ProgressBar } from "@/components/ui";
import { Card } from "@/components/ui/cards";
import { focusLabels, goalLabels } from "@/lib/generator";
import { levelLabels } from "@/data/catalog";
import { zoneById } from "@/data/body-zones";
import { programSessionName } from "@/lib/programs";
import { painNote } from "@/lib/readiness";
import { useStartMobility, useStartWorkout } from "@/lib/session";
import { useDraft, usePreference, useSettings } from "@/lib/store";
import { durationSeconds, exerciseById, sessionSets } from "@/lib/training";
import { cn, formatNumber, toDisplayWeight } from "@/lib/utils";
import { RestStatus } from "@/components/session/rest-away";
import { useProgramActions } from "@/components/train/program-actions";
import { WarmupPreview } from "@/components/train/warmup-preview";
import { locationLabels, targetLabel, topLoad } from "@/components/train/shared";
import type { ActiveProgram, TodayPlan, TodaySource } from "@/components/train/today-plan";
import type { Exercise, ExerciseRecord, TrainingDraft } from "@/types";
import { useRestDay } from "@/lib/use-rest-day";

type Props = {
  now: number;
  source: TodaySource;
  today: TodayPlan;
  active: ActiveProgram | null;
  /** Muestra la lista completa de ejercicios (desde «+N más»). */
  onShowList: () => void;
  onAdjust: () => void;
  notify: (message: string) => void;
};

/**
 * «Tu rutina de hoy»: la misma sesión que la portada de Inicio (entrenamiento a medias, siguiente sesión
 * del programa o sesión a tu medida), con un solo botón para empezar. Todo lo demás vive en «Ajustar».
 */
export function TodayCard({ now, source, today, active, onShowList, onAdjust, notify }: Props) {
  const [draft] = useDraft();
  const [preference] = usePreference();
  const place = preference.location === "gym" ? "Gimnasio" : "Casa";

  let body: ReactNode;
  if (source === "draft" && draft) body = <DraftBody draft={draft} now={now} />;
  else if (source === "program" && active) body = <ProgramBody active={active} place={place} today={today} notify={notify} onAdjust={onAdjust} />;
  else body = <CustomBody today={today} place={place} onShowList={onShowList} onAdjust={onAdjust} />;

  return (
    <section className="train-hero-slot" aria-labelledby="train-hero-title">
      <Card tone="carbon" padding="l" className="train-hero">
        {/* Al cambiar de origen (desde «Ajustar»), el contenido entra con un fundido breve. */}
        <div key={source} className="train-hero-body train-swap">{body}</div>
      </Card>
    </section>
  );
}

/** Cabecera compacta: de dónde sale la rutina y, a la derecha, la cifra clave (minutos o series). */
function Head({ meta, context, number, label, live = false }: { meta: string; context?: ReactNode; number: ReactNode; label: ReactNode; live?: boolean }) {
  return (
    <div className="train-hero-head">
      <div className="train-hero-copy">
        <p className="meta train-hero-meta">{live && <span className="train-live-dot" aria-hidden="true" />}{meta}</p>
        {context && <p className="train-hero-context">{context}</p>}
      </div>
      <p className="train-hero-stat">
        <span className="num-display">{number}</span>
        <span className="meta">{label}</span>
      </p>
    </div>
  );
}

function Title({ children, details, note }: { children: ReactNode; details: ReactNode[]; note?: string }) {
  const long = typeof children === "string" && children.length > 16;
  return (
    <div className="train-hero-main">
      <h2 id="train-hero-title" className={cn("train-hero-title", long && "is-long")}>{children}</h2>
      <MetaLine className="train-hero-details" items={details} />
      {note && <p className="train-hero-note">{note}</p>}
    </div>
  );
}

function count(value: number, one: string, many: string) {
  return <><b className="num">{value}</b> {value === 1 ? one : many}</>;
}

const SESSION_ROWS = 4;

/**
 * Los ejercicios de la sesión en una lista breve: orden, nombre y series × repeticiones. Muestra
 * hasta cuatro para que «Empezar» quede a la vista; el resto, en «+N más».
 */
function SessionList({ records, onMore }: { records: ExerciseRecord[]; onMore?: () => void }) {
  const [settings] = useSettings();
  const rows = records
    .map((record) => ({ record, exercise: exerciseById(record.exerciseId) }))
    .filter((row): row is { record: ExerciseRecord; exercise: Exercise } => Boolean(row.exercise));
  if (!rows.length) return null;
  const shown = rows.length > SESSION_ROWS + 1 ? rows.slice(0, SESSION_ROWS) : rows;
  const rest = rows.length - shown.length;
  return (
    <ol key={rows.map((row) => row.exercise.id).join("-")} className="train-session" aria-label="Ejercicios de la sesión">
      {shown.map(({ record, exercise }, index) => (
        <li key={`${exercise.id}-${index}`} style={{ "--i": index } as CSSProperties}>
          <span className="num train-session-index">{index + 1}</span>
          <span className="train-session-name">{exercise.name}</span>
          <span className="num train-session-target">
            {targetLabel(exercise, record.sets.length, record.range)}
            {topLoad(record) > 0 && <span className="train-session-load"> · {formatNumber(toDisplayWeight(topLoad(record), settings.unit))} {settings.unit}</span>}
          </span>
        </li>
      ))}
      {rest > 0 && (
        <li className="train-session-more" style={{ "--i": shown.length } as CSSProperties}>
          {onMore
            ? <button type="button" className="link-button" onClick={onMore}>+{rest} más · ver todos</button>
            : <span>+{rest} más: {rows.slice(SESSION_ROWS).map((row) => row.exercise.name).join(", ")}</span>}
        </li>
      )}
    </ol>
  );
}

function AdjustButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="s" className="train-hero-adjust" onClick={onClick}>
      <SlidersHorizontal size={16} aria-hidden="true" />
      Ajustar entrenamiento
    </Button>
  );
}

/** En día de descanso (o si tu cuerpo pide recuperar), la movilidad va primero y entrenar igual queda a un toque. */
function RestActions({ onTrain, disabled }: { onTrain: () => void; disabled: boolean }) {
  const startMobility = useStartMobility();
  return (
    <div className="train-hero-actions train-hero-rest">
      <Button size="l" onClick={() => void startMobility()}>
        <StretchHorizontal size={18} />
        Movilidad 10 min
      </Button>
      <button type="button" className="link-button train-hero-anyway" disabled={disabled} onClick={onTrain}>o entrena igual</button>
    </div>
  );
}

function CustomBody({ today, place, onShowList, onAdjust }: { today: TodayPlan; place: string; onShowList: () => void; onAdjust: () => void }) {
  const start = useStartWorkout();
  const restDay = useRestDay();
  const recommendation = today.readiness?.recommendation;
  const note = painNote(today.readiness?.pain) ?? (recommendation && recommendation !== "planned" ? today.plan?.notes[0] : undefined);
  const begin = () => void start({ name: today.name, records: today.fullRecords, restSeconds: today.restSeconds, source: { type: "generated" } });
  const total = today.records.length;
  const context = today.edited ? "Con tus cambios" : today.zone ? "Zona elegida por ti" : today.focus === today.suggested ? "Sugerida según tu recuperación" : "Enfoque elegido por ti";

  if (!today.ready) {
    return (
      <>
        <Head meta="Tu rutina de hoy" context="Preparando" number="––" label="min" />
        <div className="train-hero-main">
          <h2 id="train-hero-title" className="train-hero-title">Armando tu sesión…</h2>
        </div>
        <div className="train-hero-skeleton" aria-hidden="true" />
      </>
    );
  }

  return (
    <>
      <Head meta={restDay ? "Hoy es descanso · opcional" : "Tu rutina de hoy"} context={<><b>{goalLabels[today.goal]}</b> · {context}</>} number={today.estimated} label="min" />
      <Title details={[count(total, "ejercicio", "ejercicios"), place, levelLabels[today.level]]} note={note}>
        {zoneById(today.zone)?.label ?? focusLabels[today.focus]}
      </Title>
      <WarmupPreview items={today.warmup} included={today.includeWarmup} onToggle={today.setIncludeWarmup} />
      <SessionList records={today.records} onMore={onShowList} />
      {restDay ? <RestActions onTrain={begin} disabled={!total} /> : (
        <div className="train-hero-actions">
          <Button size="l" disabled={!total} onClick={begin}>
            <Play size={18} fill="currentColor" />
            Empezar entrenamiento
          </Button>
        </div>
      )}
      <div className="train-hero-foot">
        <AdjustButton onClick={onAdjust} />
      </div>
    </>
  );
}

function ProgramBody({ active, place, today, notify, onAdjust }: { active: ActiveProgram; place: string; today: TodayPlan; notify: (message: string) => void; onAdjust: () => void }) {
  const restDay = useRestDay();
  const { startSession, restart } = useProgramActions();
  const { program, next, day, records, warmup, done, total, weekDone } = active;
  const href = `/entrenar/programas/${program.id}`;
  const programPlace = program.location === "any" ? place : locationLabels[program.location];
  const recommendation = today.readiness?.recommendation;
  const pain = Boolean(today.readiness?.pain?.length);
  const easier = recommendation === "short" || pain;
  const note = pain
    ? "Con molestias, versión corta. Si un ejercicio molesta, cámbialo desde su menú."
    : recommendation === "short" ? "Versión corta por tu chequeo: una serie menos por ejercicio."
      : recommendation === "recovery" ? "Tu cuerpo pide recuperar: hoy, mejor movilidad." : undefined;

  if (!next) {
    return (
      <>
        <Head meta="Tu programa" context={program.name} number={total} label="sesiones" />
        <Title details={[`${program.weeks} semanas`, `${program.days.length} días por semana`]} note="Repite el ciclo para consolidar lo ganado o elige otro programa más abajo.">
          Programa completado
        </Title>
        <div className="train-hero-actions">
          <Button size="l" onClick={async () => { if (await restart(program)) notify("Programa reiniciado"); }}>
            <RotateCcw size={18} />
            Reiniciar programa
          </Button>
          <ButtonLink href={href} variant="glass" size="l" className="train-hero-icon" aria-label={`Ver ${program.name}`} title="Ver programa">
            <CalendarDays size={19} />
          </ButtonLink>
        </div>
      </>
    );
  }

  return (
    <>
      <Head meta={`${restDay ? "Hoy es descanso · " : ""}Semana ${next.week} · ${weekDone} de ${program.days.length}`} context={program.name} number={program.minutes} label="min" />
      <Title details={[count(records.length, "ejercicio", "ejercicios"), programPlace]} note={note}>
        {day ? `${day.name} · ${day.focus}` : programSessionName(program, next.week, next.day)}
      </Title>
      <WarmupPreview items={warmup} included={today.includeWarmup} onToggle={today.setIncludeWarmup} />
      <SessionList records={records} />
      {restDay || recommendation === "recovery" ? <RestActions onTrain={() => void startSession(program, next.week, next.day, { easier })} disabled={!records.length} /> : (
        <div className="train-hero-actions">
          <Button size="l" disabled={!records.length} onClick={() => void startSession(program, next.week, next.day, { easier })}>
            <Play size={18} fill="currentColor" />
            Empezar entrenamiento
          </Button>
        </div>
      )}
      <div className="train-hero-foot">
        <div className="train-hero-progress">
          <ProgressBar value={(done / total) * 100} label={`${done} de ${total} sesiones del programa`} />
          <span className="num">{done}/{total}</span>
        </div>
        <AdjustButton onClick={onAdjust} />
      </div>
    </>
  );
}

function DraftBody({ draft, now }: { draft: TrainingDraft; now: number }) {
  const { done, total } = sessionSets(draft.records);
  const minutes = Math.floor(durationSeconds(draft, now) / 60);
  const elapsed = minutes < 60 ? <><b className="num">{minutes}</b> min</> : <><b className="num">{Math.floor(minutes / 60)}</b> h <b className="num">{minutes % 60}</b> min</>;
  return (
    <>
      <Head live meta="En curso" context="Entrenamiento a medias" number={<>{done}<span className="train-soft">/{total}</span></>} label="series" />
      <Title details={[count(draft.records.length, "ejercicio", "ejercicios"), elapsed, draft.runningSince === null ? "En pausa" : <RestStatus key="rest" restUntil={draft.restUntil} fallback="Reloj en marcha" />]}>
        {draft.name}
      </Title>
      <ProgressBar value={total ? (done / total) * 100 : 0} label="Series completadas" />
      <div className="train-hero-actions">
        <ButtonLink href="/entrenar/sesion" size="l">
          <Play size={18} fill="currentColor" />
          Continuar sesión
        </ButtonLink>
      </div>
    </>
  );
}
