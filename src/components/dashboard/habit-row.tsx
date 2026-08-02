"use client";

import { Check } from "lucide-react";
import type { Habit } from "@/types";

export function HabitRow({ habit, checked, onToggle }: { habit: Habit; checked: boolean; onToggle: () => void }) {
  return (
    <button className={`habit-row ${checked ? "checked" : ""}`} onClick={onToggle} aria-pressed={checked}>
      <span className="habit-check">{checked && <Check size={16} strokeWidth={3} />}</span>
      <span><strong>{habit.title}</strong><small>{habit.detail}</small></span>
    </button>
  );
}
