"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { exercises } from "@/data/mock-data";
import { Button, Sheet } from "@/components/ui";
import { AdjustmentList } from "@/components/train/adjustment-list";
import { useWeekAdjustments } from "@/components/train/use-week-adjustments";
import { rangeText } from "@/components/train/shared";
import type { TodayPlan } from "@/components/train/today-plan";
import { goalLabels } from "@/lib/generator";
import { prescribe } from "@/lib/prescription";
import { useSettings } from "@/lib/store";
import type { PlannedDay, TrainingPlan } from "@/lib/training-plan";
import { DAY_NAMES, cleanDays, weekdayIndex } from "@/lib/training-days";
import { cn, localDateKey } from "@/lib/utils";

/** Los días de la semana de las próximas sesiones cuando tienes días fijos («lunes», «miércoles»…). */
function upcomingWeekdays(days: readonly number[] | undefined, count: number, from: Date, includeToday: boolean) {
  const fixed = cleanDays(days);
  if (!fixed.length) return [];
  const names: string[] = [];
  for (let ahead = includeToday ? 0 : 1; ahead < 28 && names.length < count; ahead += 1) {
    const date = new Date(from);
    date.setDate(date.getDate() + ahead);
    if (fixed.includes(weekdayIndex(date))) names.push(DAY_NAMES[weekdayIndex(date)]);
  }
  return names;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Las próximas sesiones del plan, empezando por la que toca. */
function upcoming(plan: TrainingPlan, startId: string | undefined) {
  const start = Math.max(0, plan.cycle.indexOf(startId ?? plan.cycle[0]));
  return Array.from({ length: plan.daysPerWeek }, (_, index) => plan.days.find((day) => day.id === plan.cycle[(start + index) % plan.cycle.length])).filter((day): day is PlannedDay => Boolean(day));
}

/**
 * «Tu plan»: la estructura que PULSO eligió para ti (con su porqué en una línea), las próximas sesiones y, si
 * quieres, cambiarla. Nada que configurar: el plan ya está hecho.
 */
export function PlanCard({ today, now }: { today: TodayPlan; now: number }) {
  const plan = today.trainingPlan;
  const [settings, updateSettings] = useSettings();
  const [changing, setChanging] = useState(false);
  const [viewing, setViewing] = useState<PlannedDay | null>(null);
  const adjustments = useWeekAdjustments(now, Boolean(plan));
  if (!plan || !now) return null;

  const date = new Date(now);
  const trainedToday = today.workouts.some((workout) => workout.date === localDateKey(date));
  const sessions = upcoming(plan, today.planDay?.id);
  const weekdays = upcomingWeekdays(settings.trainingDays, sessions.length, date, !trainedToday);
  const extra = plan.availableDays - plan.daysPerWeek;

  return (
    <section className="train-plan section" aria-labelledby="train-plan-title">
      <div className="section-head">
        <h2 id="train-plan-title">Tu plan</h2>
        <button type="button" className="link-button" onClick={() => setChanging(true)}>Cambiar estructura</button>
      </div>
      <p className="train-plan-name">{plan.label}{plan.cycle.length > 1 && plan.split === "full-body" ? ` ${plan.cycle.join("/")}` : ""}</p>
      <p className="meta train-plan-meta">{plan.daysPerWeek} {plan.daysPerWeek === 1 ? "día" : "días"} · {plan.minutes} min · {goalLabels[plan.goal]}</p>
      <div className="train-plan-why">
        <p className="meta">¿Por qué este plan?</p>
        <p>{plan.reason}</p>
        {extra > 0 && !plan.chosen && <p className="train-plan-extra">Los otros {extra === 1 ? "día" : `${extra} días`} de tu semana, caminata o movilidad.</p>}
      </div>
      {adjustments.length > 0 && <AdjustmentList items={adjustments} />}
      <ol className="list train-plan-days" aria-label="Próximas sesiones">
        {sessions.map((day, index) => (
          <li key={`${day.id}-${index}`}>
            <button type="button" className="list-row train-plan-day" onClick={() => setViewing(day)}>
              <span className="grow">
                <small className="meta">{index === 0 && today.planDay ? (trainedToday ? "Siguiente" : "Hoy") : weekdays[index] ? capitalize(weekdays[index]) : `Sesión ${index + 1}`}</small>
                <strong>{day.name}</strong>
                <small>{day.focus} · <span className="num">{day.minutes}</span> min · <span className="num">{day.exercises.length}</span> ejercicios</small>
              </span>
              <ChevronRight size={18} className="subtle" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      {plan.notes.slice(0, 2).map((note) => <p key={note} className="train-plan-note">{note}</p>)}

      <Sheet open={changing} onClose={() => setChanging(false)} eyebrow="Tu plan" title="Cambiar estructura" className="train-plan-sheet">
        <p className="muted">PULSO ya eligió la mejor para ti. Cámbiala sólo si prefieres otra.</p>
        <div className="train-options" role="group" aria-label="Estructura">
          {plan.options.map((option) => {
            const active = plan.split === option.split;
            return (
              <button
                key={option.split}
                type="button"
                className={cn("train-option", active && "is-active")}
                aria-pressed={active}
                onClick={() => {
                  updateSettings({ planSplit: option.recommended ? undefined : option.split });
                  setChanging(false);
                }}
              >
                <span className="grow">
                  <strong>{option.label}</strong>
                  <small>{option.recommended ? "Recomendado · " : ""}{option.reason}</small>
                </span>
                {active && <Check size={18} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <div className="train-sheet-actions">
          <Button onClick={() => setChanging(false)}>Listo</Button>
        </div>
      </Sheet>

      <Sheet open={viewing !== null} onClose={() => setViewing(null)} eyebrow={plan.label} title={viewing?.name ?? "Sesión"} className="train-plan-sheet">
        {viewing && (
          <>
            <p className="muted">{viewing.focus} · {viewing.minutes} min{today.includeWarmup ? " con el calentamiento" : ""}.</p>
            <ol className="list train-plan-exercises">
              {viewing.exercises.map((item) => {
                const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
                if (!exercise) return null;
                const range = prescribe(exercise, { goal: plan.goal, level: plan.level, role: item.role, minutes: plan.minutes }).range;
                return (
                  <li key={item.exerciseId} className="list-row">
                    <span className="grow">
                      <strong>{exercise.name}</strong>
                      <small><span className="num">{item.sets}</span> × <span className="num">{rangeText(range, exercise.unit)}</span>{item.group ? " · superserie" : ""}</small>
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="train-sheet-actions">
              <Button onClick={() => setViewing(null)}>Listo</Button>
            </div>
          </>
        )}
      </Sheet>
    </section>
  );
}
