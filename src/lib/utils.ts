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

const LB_PER_KG = 2.20462;

/** Convierte kg almacenados a la unidad visible, con un decimal como máximo. */
export function toDisplayWeight(kg: number, unit: "kg" | "lb") {
  const value = unit === "lb" ? kg * LB_PER_KG : kg;
  return Math.round(value * 10) / 10;
}

/** Convierte un valor ingresado por el usuario a kg para almacenarlo. */
export function fromDisplayWeight(value: number, unit: "kg" | "lb") {
  return unit === "lb" ? Math.round((value / LB_PER_KG) * 100) / 100 : value;
}

export function formatNumber(value: number, digits = 1) {
  return value.toLocaleString("es-CL", { maximumFractionDigits: digits });
}

export function formatShortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-CL", { day: "numeric", month: "short" }).replace(".", "");
}

export function formatRelativeDay(date: string, now = new Date()) {
  const today = localDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === today) return "Hoy";
  if (date === localDateKey(yesterday)) return "Ayer";
  const days = Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${date}T12:00:00`).getTime()) / 86_400_000);
  return days > 0 && days < 7 ? `Hace ${days} días` : formatShortDate(date);
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  return hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
}

/** Texto en minúsculas y sin tildes, para búsquedas. */
export function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Número de día local (estable durante todo el día, sin saltos por horario de verano). Semilla compartida del generador. */
export function localDaySeed(now: number) {
  const date = new Date(now);
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}
