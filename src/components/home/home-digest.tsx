"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, History, Sparkles, Utensils } from "lucide-react";
import { articles, habits } from "@/data/mock-data";
import { formatVolume } from "@/lib/analytics";
import { formatKcal } from "@/lib/nutrition";
import { useHabits, useMeals, useWorkouts } from "@/lib/store";
import { recordsVolume, sortedWorkouts } from "@/lib/training";
import { useNutritionDay } from "@/lib/use-nutrition";
import { formatRelativeDay } from "@/lib/utils";

/** Resumen del día en una sola lista: último entrenamiento, comidas y hábitos, y la guía del día. */
export function HomeDigest({ now, seed }: { now: number; seed: number }) {
  const [workouts] = useWorkouts();
  const [meals] = useMeals();
  const [checked] = useHabits();
  const nutrition = useNutritionDay(now);
  const last = sortedWorkouts(workouts)[0];
  const registered = meals.filter((meal) => meal.status === "Registrada").length;
  const doneHabits = habits.filter((habit) => checked.includes(habit.id)).length;
  const tip = articles[seed % articles.length];
  const volume = last ? last.volume ?? (last.records ? recordsVolume(last.records) : 0) : 0;

  return (
    <section className="section home-digest" aria-labelledby="home-digest-title">
      <h2 id="home-digest-title" className="meta">Tu día</h2>
      <div className="list">
        {last ? (
          <Link href="/progreso" className="list-row">
            <span className="icon-tile" aria-hidden="true"><History size={18} /></span>
            <span className="grow">
              <small>Último entrenamiento · {formatRelativeDay(last.date, new Date(now))}</small>
              <strong>{last.name ?? "Entrenamiento"}</strong>
              <small className="num">{Math.round(last.durationMinutes)} min{volume > 0 ? ` · ${formatVolume(volume)}` : ""}</small>
            </span>
            <ChevronRight size={18} className="subtle" aria-hidden="true" />
          </Link>
        ) : (
          <div className="list-row">
            <span className="icon-tile" aria-hidden="true"><Sparkles size={18} /></span>
            <span className="grow">
              <small>Último entrenamiento</small>
              <strong>Tu primera sesión te espera</strong>
            </span>
          </div>
        )}
        <Link href="/comidas" className="list-row">
          <span className="icon-tile" aria-hidden="true"><Utensils size={18} /></span>
          <span className="grow">
            <small>Alimentación y hábitos</small>
            {nutrition.counting && nutrition.targets ? (
              <strong><span className="num">{formatKcal(nutrition.totals.kcal)}</span> de <span className="num">{formatKcal(nutrition.targets.kcal)}</span> kcal · <span className="num">{doneHabits}</span> de <span className="num">{habits.length}</span> hábitos</strong>
            ) : nutrition.profile ? (
              <strong><span className="num">{registered}</span> de <span className="num">{meals.length}</span> comidas · <span className="num">{doneHabits}</span> de <span className="num">{habits.length}</span> hábitos</strong>
            ) : (
              <strong>Calcula tus calorías del día</strong>
            )}
          </span>
          <ChevronRight size={18} className="subtle" aria-hidden="true" />
        </Link>
        {tip && (
          <Link href="/guia" className="list-row">
            <span className="icon-tile" aria-hidden="true"><BookOpen size={18} /></span>
            <span className="grow">
              <small>Guía del día · {tip.category}</small>
              <strong>{tip.title}</strong>
            </span>
            <ChevronRight size={18} className="subtle" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
