"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Check, Utensils } from "lucide-react";
import { articles, habits } from "@/data/mock-data";
import { useHabits, useMeals } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Habit } from "@/types";

function HabitToggle({ habit, checked, onToggle }: { habit: Habit; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={cn("home-habit", checked && "checked")} aria-pressed={checked} onClick={onToggle}>
      <span className="home-habit-check" aria-hidden="true">
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="home-habit-text">
        <strong>{habit.title}</strong>
        <small>{habit.detail}</small>
      </span>
    </button>
  );
}

export function WellbeingSection({ seed }: { seed: number }) {
  const [checked, setChecked] = useHabits();
  const [meals] = useMeals();
  const registered = meals.filter((meal) => meal.status === "Registrada").length;
  const tip = articles[seed % articles.length];
  const doneHabits = habits.filter((habit) => checked.includes(habit.id)).length;

  function toggle(id: number) {
    setChecked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <section className="section home-well" aria-labelledby="home-well-title">
      <div className="spread">
        <h2 id="home-well-title" className="home-section-title">Bienestar</h2>
        <span className="subtle num home-well-count">{doneHabits}/{habits.length} hábitos</span>
      </div>
      <div className="card home-well-card">
        <div className="home-habits">
          {habits.map((habit) => (
            <HabitToggle key={habit.id} habit={habit} checked={checked.includes(habit.id)} onToggle={() => toggle(habit.id)} />
          ))}
        </div>
        <Link href="/comidas" className="home-well-row">
          <span className="icon-tile muted"><Utensils size={18} /></span>
          <span className="grow">
            <strong>Comidas de hoy</strong>
            <small><span className="num">{registered}</span> de <span className="num">{meals.length}</span> registradas</small>
          </span>
          <ArrowRight size={16} />
        </Link>
        {tip && (
          <Link href="/guia" className="home-well-row">
            <span className="icon-tile violet"><BookOpen size={18} /></span>
            <span className="grow">
              <small className="home-well-tag">Guía del día · {tip.category}</small>
              <strong>{tip.title}</strong>
            </span>
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}
