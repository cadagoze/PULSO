import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { WeekDay, WorkoutEntry } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(value: number) {
  return value.toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function startOfCurrentWeek(date = new Date()) {
  const start = new Date(date);
  const dayFromMonday = (start.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - dayFromMonday);
  return start;
}

export function workoutsThisWeek(workouts: WorkoutEntry[], now = new Date()) {
  const start = localDateKey(startOfCurrentWeek(now));
  const endDate = new Date(startOfCurrentWeek(now));
  endDate.setDate(endDate.getDate() + 6);
  const end = localDateKey(endDate);
  return workouts.filter((workout) => workout.date >= start && workout.date <= end);
}

export function currentWeekDays(workouts: WorkoutEntry[], now = new Date()): WeekDay[] {
  const start = startOfCurrentWeek(now);
  const today = localDateKey(now);
  const completedDates = new Set(workouts.map((workout) => workout.date));
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  return labels.map((short, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateKey = localDateKey(date);
    return {
      date: dateKey,
      short,
      number: date.getDate(),
      status: completedDates.has(dateKey) ? "done" : dateKey === today ? "today" : dateKey < today ? "rest" : "planned",
    };
  });
}

export function weekNumber(date = new Date()) {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  value.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return Math.ceil((((value.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
