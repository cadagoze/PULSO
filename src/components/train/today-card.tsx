"use client";

import type { CSSProperties, ReactNode } from "react";
import { CalendarDays, ChevronDown, Play, RotateCcw, Shuffle, SlidersHorizontal } from "lucide-react";
import { Button, ButtonLink, MetaLine, ProgressBar, SegmentedControl } from "@/components/ui";
import { Card } from "@/components/ui/cards";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { focusLabels } from "@/lib/generator";
import { programSessionName } from "@/lib/programs";
import { useStartWorkout } from "@/lib/session";
import { useDraft, usePreference } from "@/lib/store";
import { completedSets, durationSeconds, exerciseById, totalSets } from "@/lib/training";
import { cn } from "@/lib/utils";
import { useProgramActions } from "@/components/train/program-actions";
import { locationLabels, pad2 } from "@/components/train/shared";
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
  else if (source === "program" && active) body = <ProgramBody active={active} place={place} easier={easier} listOpen={listOpen} onToggleList={onToggleList} notify={notify} />;
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

/** El número editorial se reduce cuando tiene más cifras (p. ej. «12/20» series). */
function Head({ meta, context, number, digits = 2, label, live = false }: { meta: string; context?: ReactNode; number: ReactNode; digits?: number; label: ReactNode; live?: boolean }) {
  return (
    <div className="train-hero-head">
      <div className="train-hero-copy">
        <p className="meta train-hero-meta">{live && <span className="train-live-dot" aria-hidden="true" />}{meta}</p>
        {context && <p className="train-hero-context">{context}</p>}
      </div>
      <p className={cn("train-hero-number", digits === 3 && "is-m", digits > 3 && "is-s")}>
        <span className="num-display">{number}</span>
        <span className="meta">{label}</span>
      </p>
    </div>
  );
}

function Title({ children, details, note }: { children: ReactNode; details: ReactNode[]; note?: string }) {
  return (
    <div className="train-hero-main">
      <h2 id="train-hero-title" className="train-hero-title">{children}</h2>
      <MetaLine className="train-hero-details" items={details} />
      {note && <p className="train-hero-note">{note}</p>}
    </div>
  );
}

function count(value: number, one: string, many: string) {
  return <><b className="num">{value}</b> {value === 1 ? one : many}</>;
}

/** Miniaturas de los ejercicios; la clave las vuelve a animar cuando cambia la selección. */
function Thumbs({ records }: { records: ExerciseRecord[] }) {
  const items = records.map((record) => exerciseById(record.exerciseId)).filter((item): item is Exercise => Boolean(item));
  if (!items.length) return null;
  const shown = items.length > 5 ? items.slice(0, 4) : items;
  const rest = items.length - shown.length;
  return (
    <ul key={items.map((item) => item.id).join("-")} className="train-thumbs" aria-label="Ejercicios de la sesión">
      {shown.map((exercise, index) => (
        <li key={`${exercise.id}-${index}`} className="train-thumb" style={{ "--i": index } as CSSProperties}>
          <ExerciseVisual exercise={exercise} size="thumb" />
        </li>
      ))}
      {rest > 0 && (
        <li className="train-thumb train-thumb-more num" style={{ "--i": shown.length } as CSSProperties}>
          <span aria-hidden="true">+{rest}</span>
          <span className="sr-only">y {rest} más</span>
        </li>
      )}
    </ul>
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
        <Head meta="Tu rutina de hoy" context="Preparando" number="––" label="Min" />
        <div className="train-hero-main">
          <h2 id="train-hero-title" className="train-hero-title">Armando tu sesión…</h2>
        </div>
        <div className="train-hero-skeleton" aria-hidden="true" />
      </>
    );
  }

  return (
    <>
      <Head meta="Tu rutina de hoy" context={context} number={today.estimated} digits={String(today.estimated).length} label="Min" />
      <Title details={[count(total, "ejercicio", "ejercicios"), <><b className="num">{today.estimated}</b> min</>, place]} note={easier ? today.plan?.notes[0] : undefined}>
        {focusLabels[today.focus]}
      </Title>
      <Thumbs records={today.records} />
      <div className="train-hero-actions">
        <Button size="l" disabled={!total} onClick={() => start({ name: today.name, records: today.fullRecords, restSeconds: today.restSeconds, source: { type: "generated" } })}>
          <Play size={18} fill="currentColor" />
          Comenzar sesión
        </Button>
        <Button variant="glass" size="l" className="train-hero-icon" onClick={onAdjust} aria-label="Ajustar duración y enfoque" title="Ajustar">
          <SlidersHorizontal size={19} />
        </Button>
      </div>
      <div className="train-hero-foot">
        <Button variant="ghost" size="s" className="train-hero-reroll" onClick={today.reroll}>
          <Shuffle size={16} aria-hidden="true" />
          Otra variante
        </Button>
        {listOpen !== null && <ListToggle open={listOpen} onToggle={onToggleList} label="Ver y editar" />}
      </div>
    </>
  );
}

function ProgramBody({ active, place, easier, listOpen, onToggleList, notify }: { active: ActiveProgram; place: string; easier: boolean; listOpen: boolean | null; onToggleList: () => void; notify: (message: string) => void }) {
  const { startSession, restart } = useProgramActions();
  const { program, next, day, records, done, total, weekDone } = active;
  const href = `/entrenar/programas/${program.id}`;
  const programPlace = program.location === "any" ? place : locationLabels[program.location];

  if (!next) {
    return (
      <>
        <Head meta="Tu programa" context={program.name} number={total} label={<>Sesiones<br />completadas</>} />
        <Title details={[`${program.weeks} semanas`, `${program.days.length} días por semana`]} note="Repite el ciclo para consolidar lo ganado o elige otro programa más abajo.">
          Programa completado
        </Title>
        <div className="train-hero-actions">
          <Button size="l" onClick={() => { if (restart(program)) notify("Programa reiniciado"); }}>
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
      <Head
        meta="Tu rutina de hoy"
        context={program.name}
        number={pad2(next.week)}
        label={<>Semana<br /><span className="num">{weekDone}</span> de <span className="num">{program.days.length}</span> sesiones</>}
      />
      <Title
        details={[count(records.length, "ejercicio", "ejercicios"), <><b className="num">{program.minutes}</b> min</>, programPlace]}
        note={easier ? "Tu chequeo sugiere bajar el ritmo: puedes quitar una serie por ejercicio." : undefined}
      >
        {day ? `${day.name} · ${day.focus}` : programSessionName(program, next.week, next.day)}
      </Title>
      <Thumbs records={records} />
      <div className="train-hero-actions">
        <Button size="l" disabled={!records.length} onClick={() => startSession(program, next.week, next.day)}>
          <Play size={18} fill="currentColor" />
          Comenzar sesión
        </Button>
        <ButtonLink href={href} variant="glass" size="l" className="train-hero-icon" aria-label={`Ver ${program.name}`} title="Ver programa">
          <CalendarDays size={19} />
        </ButtonLink>
      </div>
      <div className="train-hero-foot">
        <div className="train-hero-progress">
          <ProgressBar value={(done / total) * 100} label={`${done} de ${total} sesiones del programa`} />
          <span className="num">{done}/{total}</span>
        </div>
        {listOpen !== null && <ListToggle open={listOpen} onToggle={onToggleList} label="Ver ejercicios" />}
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
      <Head live meta="En curso" context="Entrenamiento a medias" number={<>{done}<span className="train-soft">/{total}</span></>} digits={`${done}/${total}`.length} label="Series" />
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
