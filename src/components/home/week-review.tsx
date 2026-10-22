"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp, Equal } from "lucide-react";
import { Button } from "@/components/ui";
import { trainingReview } from "@/lib/training-review";
import { useSettings, useWorkouts } from "@/lib/store";
import { cn } from "@/lib/utils";

const icons = { up: ArrowUp, down: ArrowDown, hold: Equal } as const;

/**
 * Al empezar la semana: lo que hiciste la anterior y lo que PULSO propone para esta, con «Entendido» para
 * cerrarla (vuelve a aparecer sólo la semana siguiente). Sin semana anterior con sesiones, no aparece.
 */
export function WeekReview({ now }: { now: number }) {
  const [workouts] = useWorkouts();
  const [settings, updateSettings] = useSettings();
  const review = useMemo(
    () => (now ? trainingReview(workouts, { now: new Date(now), goal: Math.max(1, settings.weeklyGoal), unit: settings.unit, seen: settings.weekReviewSeen }) : null),
    [now, settings.unit, settings.weekReviewSeen, settings.weeklyGoal, workouts],
  );
  if (!review) return null;
  return (
    <section className="home-review" aria-labelledby="home-review-title">
      <h2 id="home-review-title" className="meta">Tu semana pasada</h2>
      <ul className="home-review-lines">
        {review.lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
      {review.next.length > 0 && (
        <div className="home-review-next">
          <p className="meta">Para esta semana</p>
          <ul>
            {review.next.map((item) => {
              const Icon = icons[item.direction];
              return (
                <li key={item.name} className={cn(`is-${item.direction}`)}>
                  <Icon size={14} strokeWidth={2.4} aria-hidden="true" />
                  <span><strong>{item.name}</strong> <b className="num">{item.change}</b> · {item.reason}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <Button variant="secondary" size="s" className="home-review-ok" onClick={() => updateSettings({ weekReviewSeen: review.weekStart })}>Entendido</Button>
    </section>
  );
}
