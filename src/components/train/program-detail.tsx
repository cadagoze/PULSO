"use client";

import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, Play, RotateCcw, X } from "lucide-react";
import { goalLabels, levelLabels } from "@/data/catalog";
import { ProgressBar } from "@/components/ui";
import { nextProgramSession, programById, programTotalSessions, sessionKey } from "@/lib/programs";
import { exerciseById } from "@/lib/training";
import { locationLabels, rangeText, restText } from "@/components/train/shared";
import { useProgramActions } from "@/components/train/program-actions";
import type { Program, ProgramDay } from "@/types";

export function ProgramDetail({ programId }: { programId: string }) {
  const program = programById(programId);
  const { progress, begin, abandon, restart, startSession } = useProgramActions();
  if (!program) return null;

  const isActive = progress?.programId === program.id;
  const completed = isActive ? progress.completed : [];
  const total = programTotalSessions(program);
  const next = isActive ? nextProgramSession(program, progress) : { week: 1, day: 1 };
  const currentWeek = next?.week ?? program.weeks;

  return (
    <div className="page train-detail">
      <Link href="/entrenar?tab=programas" className="train-back">
        <ArrowLeft size={18} />
        Programas
      </Link>

      <section className="card card-forest card-l train-hero">
        <div className="row train-program-tags">
          <span className="badge badge-solid">{goalLabels[program.goal]}</span>
          <span className="badge train-badge-onforest">{levelLabels[program.level]}</span>
          {isActive && <span className="badge train-badge-onforest">En curso</span>}
        </div>
        <h1>{program.name}</h1>
        <p className="train-hero-summary">{program.summary}</p>
        <dl className="train-hero-facts">
          <div><dt>Semanas</dt><dd className="num">{program.weeks}</dd></div>
          <div><dt>Días/sem</dt><dd className="num">{program.days.length}</dd></div>
          <div><dt>Minutos</dt><dd className="num">{program.minutes}</dd></div>
          <div><dt>Lugar</dt><dd>{locationLabels[program.location]}</dd></div>
        </dl>
        <p className="train-hero-equip">{program.equipmentNote}</p>
        {isActive && (
          <div className="stack-s">
            <div className="spread train-hero-progress">
              <span>Avance</span>
              <span className="num">{completed.length}/{total} sesiones</span>
            </div>
            <ProgressBar value={(completed.length / total) * 100} label="Avance del programa" />
          </div>
        )}
        <div className="train-active-actions">
          {isActive ? (
            next ? (
              <button type="button" className="btn btn-primary" onClick={() => startSession(program, next.week, next.day)}>
                <Play size={17} />
                Continuar · S{next.week} D{next.day}
              </button>
            ) : (
              <span className="train-hero-done"><Check size={18} />Programa completado</span>
            )
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => begin(program)}>
              <Play size={17} />
              Comenzar programa
            </button>
          )}
          {isActive && (
            <>
              <button type="button" className="btn train-btn-onforest" onClick={() => restart(program)}>
                <RotateCcw size={16} />
                Reiniciar
              </button>
              <button type="button" className="btn train-btn-onforest" onClick={() => abandon(program)}>
                <X size={16} />
                Abandonar
              </button>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Cómo progresa</h2></div>
        <ol className="train-progression">
          {program.weekNotes.map((note, index) => {
            const delta = program.weekSetDelta[index] ?? 0;
            return (
              <li key={index} className={isActive && index + 1 === currentWeek ? "now" : undefined}>
                <span className="train-progression-week num">S{index + 1}</span>
                <p>{note}</p>
                {delta !== 0 && <span className={delta > 0 ? "badge" : "badge badge-muted"}>{delta > 0 ? `+${delta}` : delta} serie{Math.abs(delta) > 1 ? "s" : ""}</span>}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="section">
        <div className="section-head"><h2>Semana a semana</h2></div>
        <div className="train-weeks">
          {Array.from({ length: program.weeks }, (_, index) => index + 1).map((week) => {
            const weekDone = program.days.filter((_, day) => completed.includes(sessionKey(week, day + 1))).length;
            return (
              <details key={week} className="train-week" open={week === currentWeek}>
                <summary>
                  <span className="train-week-no num">{String(week).padStart(2, "0")}</span>
                  <span className="grow">
                    <strong>Semana {week}</strong>
                    <small className="num">{weekDone}/{program.days.length} sesiones{program.weekSetDelta[week - 1] ? ` · ${program.weekSetDelta[week - 1] > 0 ? "+" : ""}${program.weekSetDelta[week - 1]} serie` : ""}</small>
                  </span>
                  {weekDone === program.days.length && <span className="train-check on" aria-label="Semana completa"><Check size={14} /></span>}
                  <ChevronDown size={18} className="train-week-chevron" />
                </summary>
                <div className="train-week-days">
                  {program.days.map((day, dayIndex) => (
                    <ProgramDayCard
                      key={dayIndex}
                      program={program}
                      day={day}
                      week={week}
                      done={completed.includes(sessionKey(week, dayIndex + 1))}
                      onStart={() => startSession(program, week, dayIndex + 1)}
                    />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ProgramDayCard({ program, day, week, done, onStart }: { program: Program; day: ProgramDay; week: number; done: boolean; onStart: () => void }) {
  const delta = program.weekSetDelta[week - 1] ?? 0;
  return (
    <article className={done ? "train-day done" : "train-day"}>
      <header className="spread">
        <div className="row">
          <span className={done ? "train-check on" : "train-check"} aria-label={done ? "Completada" : "Pendiente"}>
            {done && <Check size={14} />}
          </span>
          <div>
            <strong>{day.name}</strong>
            <small className="muted">{day.focus}</small>
          </div>
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={onStart} aria-label={`Entrenar ${day.name} de la semana ${week}`}>
          <Play size={14} />
          {done ? "Repetir" : "Entrenar"}
        </button>
      </header>
      <ul className="train-day-items">
        {day.items.map((item, index) => {
          const exercise = exerciseById(item.exerciseId);
          if (!exercise) return null;
          return (
            <li key={index}>
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
