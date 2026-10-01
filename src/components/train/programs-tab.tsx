"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, MapPin, Play, Trophy } from "lucide-react";
import { programs } from "@/data/programs";
import { goalLabels, levelLabels } from "@/data/catalog";
import { ProgressBar } from "@/components/ui";
import { nextProgramSession, programById, programTotalSessions } from "@/lib/programs";
import { locationLabels } from "@/components/train/shared";
import { useProgramActions } from "@/components/train/program-actions";
import type { Program, ProgramProgress } from "@/types";

export function ProgramsTab() {
  const { progress } = useProgramActions();
  const active = progress ? programById(progress.programId) : undefined;
  return (
    <div className="train-programs">
      {active && progress && <ActiveProgram program={active} progress={progress} />}
      <section className="section">
        <div className="section-head">
          <h2>{active ? "Todos los programas" : "Elige un programa"}</h2>
          <span className="subtle num">{programs.length} planes</span>
        </div>
        <div className="train-catalog">
          {programs.map((program, index) => (
            <ProgramCard key={program.id} program={program} index={index} active={program.id === active?.id} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function ActiveProgram({ program, progress }: { program: Program; progress: ProgramProgress }) {
  const { startSession, restart } = useProgramActions();
  const total = programTotalSessions(program);
  const done = progress.completed.length;
  const next = nextProgramSession(program, progress);
  const day = next ? program.days[next.day - 1] : undefined;
  return (
    <section className="card card-forest card-l train-active" aria-label="Programa activo">
      <div className="train-active-top">
        <p className="eyebrow">Programa activo</p>
        <span className="train-active-count num">{done}/{total}</span>
      </div>
      <h2>{program.name}</h2>
      <ProgressBar value={(done / total) * 100} label={`${done} de ${total} sesiones completadas`} />
      {next && day ? (
        <>
          <div className="train-active-next">
            <span className="num">Semana {next.week} · Día {next.day}</span>
            <strong>{day.name} · {day.focus}</strong>
            <small className="num">~{program.minutes} min · {day.items.length} ejercicios</small>
          </div>
          <div className="train-active-actions">
            <button type="button" className="btn btn-primary" onClick={() => startSession(program, next.week, next.day)}>
              <Play size={17} />
              Continuar
            </button>
            <Link href={`/entrenar/programas/${program.id}`} className="btn train-btn-onforest">
              Ver programa
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="train-active-next">
            <Trophy size={20} />
            <strong>¡Completaste el programa!</strong>
            <small>Repite el ciclo para consolidar o elige uno nuevo.</small>
          </div>
          <div className="train-active-actions">
            <button type="button" className="btn btn-primary" onClick={() => restart(program)}>Reiniciar</button>
            <Link href={`/entrenar/programas/${program.id}`} className="btn train-btn-onforest">Ver programa</Link>
          </div>
        </>
      )}
    </section>
  );
}

function ProgramCard({ program, index, active }: { program: Program; index: number; active: boolean }) {
  return (
    <Link href={`/entrenar/programas/${program.id}`} className={active ? "train-program on" : "train-program"} data-goal={program.goal}>
      <div className="train-program-art" aria-hidden="true">
        <span className="train-program-no num">{String(index + 1).padStart(2, "0")}</span>
        <span className="train-program-weeks num">
          {program.weeks}
          <small>semanas</small>
        </span>
      </div>
      <div className="train-program-body">
        <div className="row train-program-tags">
          <span className="badge">{goalLabels[program.goal]}</span>
          <span className="badge badge-muted">{levelLabels[program.level]}</span>
          {active && <span className="badge badge-solid">Activo</span>}
        </div>
        <h3>{program.name}</h3>
        <p className="muted">{program.summary}</p>
        <ul className="train-facts num">
          <li><CalendarDays size={14} />{program.days.length} días/sem</li>
          <li><Clock3 size={14} />{program.minutes} min</li>
          <li><MapPin size={14} />{locationLabels[program.location]}</li>
        </ul>
        <p className="train-program-equip subtle">{program.equipmentNote}</p>
        <span className="link-button">
          Ver programa
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}
