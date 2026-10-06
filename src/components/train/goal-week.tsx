"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, ChevronRight, Dumbbell, Footprints, Layers, Timer, Zap } from "lucide-react";
import { goalGuides, majorMuscleGroups, totalCalories, weekTraining } from "@/lib/energy";
import { formatKcal, goalFromAssessment, goalLabels } from "@/lib/nutrition";
import { useNutritionProfile, useProfile, useWorkouts } from "@/lib/store";
import { useLatestWeight } from "@/lib/use-nutrition";
import { cn } from "@/lib/utils";

const routineNotes = {
  lose: "Tu rutina de hoy ya viene con descansos más cortos para este objetivo.",
  gain: "Tu rutina de hoy suma series en los ejercicios principales para este objetivo.",
  maintain: null,
};

function range({ min, max }: { min: number; max: number }) {
  return min === max ? String(min) : `${min}–${max}`;
}

/**
 * Qué entrenar esta semana según tu objetivo (el de Nutrición o, si aún no lo calculas, el de tu
 * evaluación): días de fuerza, intervalos o minutos de actividad, pasos y qué ejercicios priorizar.
 */
export function GoalWeek({ now }: { now: number }) {
  const [nutrition] = useNutritionProfile();
  const [assessment] = useProfile();
  const [workouts] = useWorkouts();
  const weightKg = useLatestWeight();
  const goal = nutrition?.goal ?? goalFromAssessment(assessment?.goals);
  const guide = goalGuides[goal];
  const week = weekTraining(workouts, new Date(now));
  const kcal = weightKg ? totalCalories(week.sessions, weightKg) : 0;
  const routineNote = nutrition ? routineNotes[goal] : null;

  return (
    <section id="objetivo" className="section train-section goal-week" aria-labelledby="goal-week-title">
      <div className="section-head">
        <h2 id="goal-week-title">Tu semana</h2>
        <span className="meta">{goalLabels[goal]}</span>
      </div>
      <p className="train-section-line">{guide.headline}</p>

      <div className="list">
        <Row icon={<Dumbbell size={18} />} title="Fuerza" detail={`${range(guide.strength)} días por semana`} done={week.strengthDays} target={guide.strength.min} />
        {guide.intervals && (
          <Row href="/entrenar/intervalos" icon={<Zap size={18} />} title="Intervalos" detail={`${range(guide.intervals)} sesiones de 10–20 min`} done={week.intervals} target={guide.intervals.min} />
        )}
        {guide.activityMinutes && (
          <Row icon={<Timer size={18} />} title="Actividad moderada" detail={`${guide.activityMinutes} min a la semana, más tus caminatas`} done={week.minutes} target={guide.activityMinutes} unit="min" />
        )}
        {guide.setsPerMuscle && (
          <Row href="/progreso" icon={<Layers size={18} />} title="Series por músculo" detail={`${range(guide.setsPerMuscle)} por grupo a la semana`} done={week.musclesOnTarget} target={majorMuscleGroups.length} unit="grupos" />
        )}
        <Row icon={<Footprints size={18} />} title="Pasos" detail={guide.steps} />
      </div>

      <div className="goal-week-focus">
        <p><b>Qué ejercicios priorizar.</b> {guide.focus}</p>
        {routineNote && <p className="goal-week-note"><Check size={15} strokeWidth={2.6} aria-hidden="true" />{routineNote}</p>}
      </div>

      <Link href="/comidas" className="goal-week-foot pressable">
        <span className="grow">
          {kcal > 0
            ? <>≈ <b className="num">{formatKcal(kcal)}</b> kcal en tus entrenamientos</>
            : nutrition ? "Tus calorías y macros de hoy" : "Calcula cuánto comer para tu objetivo"}
        </span>
        <span className="goal-week-foot-link">{nutrition ? "Nutrición" : "Calcular"}<ArrowRight size={16} aria-hidden="true" /></span>
      </Link>
    </section>
  );
}

function Row({ icon, title, detail, done, target, unit, href }: { icon: ReactNode; title: string; detail: string; done?: number; target?: number; unit?: string; href?: string }) {
  const counted = done !== undefined && target !== undefined;
  const met = counted && done >= target;
  const content = (
    <>
      <span className={cn("icon-tile", met && "accent goal-week-met")} aria-hidden="true">{met ? <Check size={18} strokeWidth={2.6} /> : icon}</span>
      <span className="grow">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      {counted && (
        <span className="goal-week-count" aria-label={`${done} de ${target}${unit ? ` ${unit}` : ""}`}>
          <b className="num">{done}</b><span className="num">/{target}</span>
        </span>
      )}
      {href && <ChevronRight size={18} className="subtle" aria-hidden="true" />}
    </>
  );
  return href
    ? <Link href={href} className="list-row">{content}</Link>
    : <div className="list-row">{content}</div>;
}
