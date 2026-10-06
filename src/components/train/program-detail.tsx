"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowLeft, Check, ChevronDown, Play, RotateCcw, X } from "lucide-react";
import { goalLabels, levelLabels } from "@/data/catalog";
import { Button, NumberMetric, ProgressBar, StatusBadge } from "@/components/ui";
import { nextProgramSession, programById, programTotalSessions, sessionKey } from "@/lib/programs";
import { useDraft } from "@/lib/store";
import { exerciseById } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { useProgramActions } from "@/components/train/program-actions";
import { programPhoto } from "@/components/train/program-covers";
import { locationLabels, pad2, rangeText, restText } from "@/components/train/shared";
import { Toast, useToast } from "@/components/ui/toast";
import type { Program, ProgramDay } from "@/types";
import { usePersonalization } from "@/lib/use-personalize";

/** Detalle de un programa: portada editorial, avance y acciones, y la estructura semana a semana. */
export function ProgramDetail({ programId }: { programId: string }) {
  const now = useNow();
  const ready = now !== 0;
  const program = programById(programId);
  const { progress, begin, abandon, restart, startSession } = useProgramActions();
  const [draft] = useDraft();
  const toast = useToast();
  if (!program) return null;

  const isActive = ready && progress?.programId === program.id;
  const completed = isActive && progress ? progress.completed : [];
  const total = programTotalSessions(program);
  const next = isActive && progress ? nextProgramSession(program, progress) : { week: 1, day: 1 };
  const currentWeek = next?.week ?? program.weeks;

  return (
    <div className={cn("page train-detail", draft && "has-resume")}>
      <Cover program={program} active={isActive} week={currentWeek} />

      <div className="train-detail-main">
        <p className="train-detail-summary">{program.summary}</p>
        <div className="train-facts">
          <NumberMetric size="m" value={program.weeks} label="semanas" />
          <NumberMetric size="m" value={program.days.length} label="días por semana" />
          <NumberMetric size="m" value={program.minutes} unit="min" label="por sesión" />
        </div>
        <p className="train-equip-note"><strong>{locationLabels[program.location]}</strong> · {program.equipmentNote}</p>

        {!ready ? (
          <div className="train-skeleton train-skeleton-plan" aria-hidden="true" />
        ) : isActive ? (
          <section className="train-plan" aria-label="Tu avance en el programa">
            <div className="train-plan-top">
              <NumberMetric size="l" value={<>{completed.length}<span className="nmetric-soft">/{total}</span></>} label="sesiones completadas" />
              {next ? (
                <p className="train-plan-next">
                  <span className="meta">Próxima</span>
                  <strong>Semana {next.week} · {program.days[next.day - 1]?.name}</strong>
                  <small>{program.days[next.day - 1]?.focus}</small>
                </p>
              ) : (
                <StatusBadge tone="solid"><Check size={13} strokeWidth={3} />Completado</StatusBadge>
              )}
            </div>
            <ProgressBar value={(completed.length / total) * 100} label="Avance del programa" />
            <div className="train-actions">
              {next ? (
                <Button size="l" onClick={() => startSession(program, next.week, next.day)}>
                  <Play size={18} fill="currentColor" />
                  Continuar · S{next.week} D{next.day}
                </Button>
              ) : (
                <Button size="l" onClick={() => { if (restart(program)) toast.show("Programa reiniciado"); }}>
                  <RotateCcw size={18} />
                  Repetir el programa
                </Button>
              )}
              <div className="train-actions-secondary">
                {next && (
                  <Button variant="secondary" onClick={() => { if (restart(program)) toast.show("Programa reiniciado"); }}>
                    <RotateCcw size={16} />
                    Reiniciar
                  </Button>
                )}
                <Button variant="ghost" onClick={() => { if (abandon(program)) toast.show("Programa abandonado"); }}>
                  <X size={16} />
                  Abandonar
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <div className="train-actions">
            <Button size="l" onClick={() => { if (begin(program)) toast.show("Programa activado: tu primera sesión te espera"); }}>
              <Play size={18} fill="currentColor" />
              Comenzar programa
            </Button>
          </div>
        )}

        <section className="train-weeks" aria-labelledby="train-weeks-title">
          <h2 id="train-weeks-title" className="meta">Semana a semana</h2>
          {Array.from({ length: program.weeks }, (_, index) => index + 1).map((week) => {
            const weekDone = program.days.filter((_, day) => completed.includes(sessionKey(week, day + 1))).length;
            const delta = program.weekSetDelta[week - 1] ?? 0;
            const current = isActive && week === currentWeek;
            const full = weekDone === program.days.length;
            return (
              <details key={week} className={cn("train-week", current && "is-current")} open={ready && week === currentWeek}>
                <summary>
                  <span className={cn("train-week-no num-display", full && "is-done")}>{pad2(week)}</span>
                  <span className="train-week-copy">
                    <span className="train-week-title">
                      <strong>Semana {week}</strong>
                      {current && <StatusBadge tone="solid">Ahora</StatusBadge>}
                    </span>
                    <small className="num">
                      {weekDone}/{program.days.length} sesiones
                      {delta !== 0 && ` · ${delta > 0 ? "+" : ""}${delta} serie${Math.abs(delta) > 1 ? "s" : ""}`}
                    </small>
                    {program.weekNotes[week - 1] && <span className="train-week-note">{program.weekNotes[week - 1]}</span>}
                  </span>
                  {full && <span className="train-check on" aria-label="Semana completa"><Check size={14} strokeWidth={3} /></span>}
                  <ChevronDown size={18} className="train-week-chevron" aria-hidden="true" />
                </summary>
                <div className="train-week-days">
                  {program.days.map((day, dayIndex) => (
                    <DayCard
                      key={dayIndex}
                      program={program}
                      day={day}
                      week={week}
                      index={dayIndex}
                      done={completed.includes(sessionKey(week, dayIndex + 1))}
                      onStart={() => startSession(program, week, dayIndex + 1)}
                    />
                  ))}
                </div>
              </details>
            );
          })}
        </section>
      </div>
      <Toast toast={toast.toast} className={cn("train-toast", draft && "is-raised")} />
    </div>
  );
}

/** Portada: foto editorial (programas de casa) o portada tipográfica sobre atmósfera con grano. */
function Cover({ program, active, week }: { program: Program; active: boolean; week: number }) {
  const { audience } = usePersonalization();
  const photo = programPhoto(program, audience);
  return (
    <section className={cn("train-cover on-dark", photo ? "photo photo-shade grain" : "atmosphere grain")} aria-labelledby="train-cover-title">
      {photo && (
        <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 1024px) 100vw, 560px" preload loading="eager" className="photo-img" style={{ objectPosition: photo.position ?? "center" }} />
      )}
      <div className="train-cover-top photo-content">
        <Link href="/entrenar?tab=programas" className="icon-button glass" aria-label="Volver a Entrenar">
          <ArrowLeft size={20} />
        </Link>
      </div>
      <div className="train-cover-body photo-content">
        <p className="train-cover-number">
          <span className="num-display">{pad2(active ? week : program.weeks)}</span>
          <span className="meta">{active ? `Semana ${week} de ${program.weeks}` : "Semanas"}</span>
        </p>
        <h1 id="train-cover-title" className="train-cover-title">{program.name}</h1>
        <p className="train-cover-tags">
          <span className="photo-tag glass">{goalLabels[program.goal]}</span>
          <span className="photo-tag glass">{levelLabels[program.level]}</span>
          {active && <span className="photo-tag glass"><span className="train-live-dot" aria-hidden="true" />En curso</span>}
        </p>
      </div>
    </section>
  );
}

function DayCard({ program, day, week, index, done, onStart }: { program: Program; day: ProgramDay; week: number; index: number; done: boolean; onStart: () => void }) {
  const delta = program.weekSetDelta[week - 1] ?? 0;
  return (
    <article className={cn("train-day", done && "done")} style={{ "--i": index } as CSSProperties}>
      <header className="train-day-head">
        <span className={cn("train-check", done && "on")} role="img" aria-label={done ? "Completada" : "Pendiente"}>
          {done && <Check size={14} strokeWidth={3} />}
        </span>
        <span className="grow">
          <strong>{day.name}</strong>
          <small>{day.focus}</small>
        </span>
        <Button variant={done ? "ghost" : "secondary"} size="s" onClick={onStart} aria-label={`${done ? "Repetir" : "Entrenar"} ${day.name} de la semana ${week}`}>
          <Play size={14} fill="currentColor" />
          {done ? "Repetir" : "Entrenar"}
        </Button>
      </header>
      <ul className="train-day-items">
        {day.items.map((item, itemIndex) => {
          const exercise = exerciseById(item.exerciseId);
          if (!exercise) return null;
          return (
            <li key={itemIndex}>
              <span className="grow">{exercise.name}</span>
              <span className="num">{Math.max(1, item.sets + delta)} × {rangeText(item.range, exercise.unit)}</span>
              <span className="subtle num">{restText(item.restSeconds)}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
