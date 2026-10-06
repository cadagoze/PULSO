"use client";

import type { CSSProperties, ReactNode } from "react";
import { CalendarDays, ChevronDown, Play, RotateCcw, Shuffle, SlidersHorizontal } from "lucide-react";
import { Button, ButtonLink, MetaLine, ProgressBar, SegmentedControl } from "@/components/ui";
import { Card } from "@/components/ui/cards";
import { focusLabels } from "@/lib/generator";
import { programSessionName } from "@/lib/programs";
import { useStartWorkout } from "@/lib/session";
import { useDraft, usePreference, useSettings } from "@/lib/store";
import { completedSets, durationSeconds, exerciseById, totalSets } from "@/lib/training";
import { cn, formatNumber, toDisplayWeight } from "@/lib/utils";
import { useProgramActions } from "@/components/train/program-actions";
import { locationLabels, targetLabel, topLoad } from "@/components/train/shared";
import type { ActiveProgram, TodayPlan, TodaySource } from "@/components/train/today-plan";
import type { Exercise, ExerciseRecord, TrainingDraft } from "@/types";

const sourceLabels: Record<TodaySource, string> = { draft: "En curso", program: "Programa", custom: "A tu medida" };

type Props = {
  now: number;
  source: TodaySource;
  sources: TodaySource[];
  onSource: (source: TodaySource) => void;
  today: TodayPlan;
  active: ActiveProgram | null;
  /** Estado de la lista de ejercicios (debajo de la tarjeta en móvil). `null` = no hay botón (escritorio). */
  listOpen: boolean | null;
  onToggleList: () => void;
  onAdjust: () => void;
  notify: (message: string) => void;
};

/**
 * «Tu rutina de hoy»: la misma sesión que la portada de Inicio (entrenamiento a medias, siguiente sesión
 * del programa o sesión a tu medida), en una tarjeta carbón con un número editorial.
 */
export function TodayCard({ now, source, sources, onSource, today, active, listOpen, onToggleList, onAdjust, notify }: Props) {
  const [draft] = useDraft();
  const [preference] = usePreference();
  const place = preference.location === "gym" ? "Gimnasio" : "Casa";
  const easier = Boolean(today.readiness && today.readiness.recommendation !== "planned");

  let body: ReactNode;
  if (source === "draft" && draft) body = <DraftBody draft={draft} now={now} />;
  else if (source === "program" && active) body = <ProgramBody active={active} place={place} easier={easier} notify={notify} />;
  else body = <CustomBody today={today} place={place} easier={easier} listOpen={listOpen} onToggleList={onToggleList} onAdjust={onAdjust} />;

  return (
    <section className="train-hero-slot" aria-labelledby="train-hero-title">
      <Card tone="carbon" padding="l" className="train-hero">
        {sources.length > 1 && (
          <SegmentedControl
            size="s"
            className={cn("train-hero-switch", sources.length > 2 && "is-triple")}
            label="Origen de la rutina de hoy"
            options={sources.map((value) => ({ value, label: sourceLabels[value] }))}
            value={source}
            onChange={onSource}
          />
        )}
        {/* Al cambiar de origen, el contenido entra con un fundido breve. */}
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
function SessionList({ records, ranges, onMore }: { records: ExerciseRecord[]; ranges?: Array<[number, number] | undefined>; onMore?: () => void }) {
  const [settings] = useSettings();
  const rows = records
    .map((record, index) => ({ record, exercise: exerciseById(record.exerciseId), range: ranges?.[index] }))
    .filter((row): row is { record: ExerciseRecord; exercise: Exercise; range: [number, number] | undefined } => Boolean(row.exercise));
  if (!rows.length) return null;
  const shown = rows.length > SESSION_ROWS + 1 ? rows.slice(0, SESSION_ROWS) : rows;
  const rest = rows.length - shown.length;
  return (
    <ol key={rows.map((row) => row.exercise.id).join("-")} className="train-session" aria-label="Ejercicios de la sesión">
      {shown.map(({ record, exercise, range }, index) => (
        <li key={`${exercise.id}-${index}`} style={{ "--i": index } as CSSProperties}>
          <span className="num train-session-index">{index + 1}</span>
          <span className="train-session-name">{exercise.name}</span>
          <span className="num train-session-target">
            {targetLabel(exercise, record.sets.length, range ?? record.range)}
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

function ListToggle({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <Button variant="ghost" size="s" className={cn("train-hero-toggle", open && "is-open")} aria-expanded={open} aria-controls="train-exercises" onClick={onToggle}>
      {label}
      <ChevronDown size={16} aria-hidden="true" />
    </Button>
  );
}

function CustomBody({ today, place, easier, listOpen, onToggleList, onAdjust }: { today: TodayPlan; place: string; easier: boolean; listOpen: boolean | null; onToggleList: () => void; onAdjust: () => void }) {
  const start = useStartWorkout();
  const total = today.records.length;
  const context = today.edited ? "Con tus cambios" : today.focus === today.suggested ? "Sugerida según tu recuperación" : "Enfoque elegido por ti";

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
      <Head meta="Tu rutina de hoy" context={context} number={today.estimated} label="min" />
      <Title details={[count(total, "ejercicio", "ejercicios"), place]} note={easier ? today.plan?.notes[0] : undefined}>
        {focusLabels[today.focus]}
      </Title>
      <SessionList records={today.records} onMore={listOpen === false ? onToggleList : undefined} />
      <div className="train-hero-actions">
        <Button size="l" disabled={!total} onClick={() => start({ name: today.name, records: today.fullRecords, restSeconds: today.restSeconds, source: { type: "generated" } })}>
          <Play size={18} fill="currentColor" />
          Empezar ahora
        </Button>
      </div>
      <div className="train-hero-foot">
        <Button variant="ghost" size="s" onClick={onAdjust}>
          <SlidersHorizontal size={16} aria-hidden="true" />
          Ajustar
        </Button>
        <Button variant="ghost" size="s" className="train-hero-reroll" onClick={today.reroll}>
          <Shuffle size={16} aria-hidden="true" />
          Otra variante
        </Button>
        {listOpen !== null && <ListToggle open={listOpen} onToggle={onToggleList} label="Editar" />}
      </div>
    </>
  );
}

function ProgramBody({ active, place, easier, notify }: { active: ActiveProgram; place: string; easier: boolean; notify: (message: string) => void }) {
  const { startSession, restart } = useProgramActions();
  const { program, next, day, records, done, total, weekDone } = active;
  const href = `/entrenar/programas/${program.id}`;
  const programPlace = program.location === "any" ? place : locationLabels[program.location];

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
      <Head meta={`Semana ${next.week} · ${weekDone} de ${program.days.length}`} context={program.name} number={program.minutes} label="min" />
      <Title
        details={[count(records.length, "ejercicio", "ejercicios"), programPlace]}
        note={easier ? "Tu chequeo sugiere bajar el ritmo: puedes quitar una serie por ejercicio." : undefined}
      >
        {day ? `${day.name} · ${day.focus}` : programSessionName(program, next.week, next.day)}
      </Title>
      <SessionList records={records} ranges={(day?.items ?? []).filter((item) => exerciseById(item.exerciseId)).map((item) => item.range)} />
      <div className="train-hero-actions">
        <Button size="l" disabled={!records.length} onClick={() => startSession(program, next.week, next.day)}>
          <Play size={18} fill="currentColor" />
          Empezar ahora
        </Button>
      </div>
      <div className="train-hero-foot">
        <div className="train-hero-progress">
          <ProgressBar value={(done / total) * 100} label={`${done} de ${total} sesiones del programa`} />
          <span className="num">{done}/{total}</span>
        </div>
        <ButtonLink href={href} variant="ghost" size="s" className="train-hero-toggle">
          <CalendarDays size={16} aria-hidden="true" />
          Ver programa
        </ButtonLink>
      </div>
    </>
  );
}

function DraftBody({ draft, now }: { draft: TrainingDraft; now: number }) {
  const done = completedSets(draft.records);
  const total = totalSets(draft.records);
  const minutes = Math.floor(durationSeconds(draft, now) / 60);
  const elapsed = minutes < 60 ? <><b className="num">{minutes}</b> min</> : <><b className="num">{Math.floor(minutes / 60)}</b> h <b className="num">{minutes % 60}</b> min</>;
  return (
    <>
      <Head live meta="En curso" context="Entrenamiento a medias" number={<>{done}<span className="train-soft">/{total}</span></>} label="series" />
      <Title details={[count(draft.records.length, "ejercicio", "ejercicios"), elapsed, draft.runningSince === null ? "En pausa" : "Reloj en marcha"]}>
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
