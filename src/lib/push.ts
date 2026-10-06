"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { weekRange, weekStreak } from "@/lib/analytics";
import { waterGoal } from "@/lib/nutrition";
import { VAPID_PUBLIC_KEY } from "@/lib/push-config";
import { defaultPushPrefs, type PushPrefs, type PushState } from "@/lib/reminders";
import { cleanDays } from "@/lib/training-days";
import { useFoodLog, useNutritionProfile, useSettings, useWater, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { useLatestWeight } from "@/lib/use-nutrition";
import { usePersistentState } from "@/lib/use-persistent-state";
import { localDateKey } from "@/lib/utils";

/**
 * Avisos en el teléfono: permiso, suscripción y el estado mínimo del día que se envía al servidor
 * para que sólo avise cuando sirve. Las preferencias son de este dispositivo (no se sincronizan).
 */

export interface PushSettings { enabled: boolean; endpoint: string | null; prefs: PushPrefs }
const PUSH_KEY = "pulso:push";
const initialPush: PushSettings = { enabled: false, endpoint: null, prefs: defaultPushPrefs };

export function usePushSettings() {
  return usePersistentState<PushSettings>(PUSH_KEY, initialPush);
}

export type PushSupport = "ready" | "needs-install" | "denied" | "unsupported";

/** Si este navegador puede recibir avisos (en iPhone, sólo con PULSO instalada en la pantalla de inicio). */
export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return ios && !standalone ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ready";
}

// El permiso puede cambiar fuera de la app: se vuelve a leer al volver a la pestaña.
function onVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

export function usePushSupport() {
  return useSyncExternalStore(onVisibility, pushSupport, () => "unsupported" as PushSupport);
}

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function post(path: string, body: unknown) {
  const response = await fetch(`/api/push/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return response;
}

async function registration() {
  const current = await navigator.serviceWorker.getRegistration();
  if (!current) await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

/** Pide permiso, suscribe este teléfono y lo registra en el servidor. Devuelve la dirección de la suscripción. */
export async function enablePush(prefs: PushPrefs, state: PushState | null): Promise<{ ok: true; endpoint: string } | { ok: false; reason: "denied" | "error" }> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };
    const sw = await registration();
    const subscription = (await sw.pushManager.getSubscription()) ?? (await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
    const response = await post("subscribe", { subscription: subscription.toJSON(), tz: timeZone(), prefs, state });
    return response.ok ? { ok: true, endpoint: subscription.endpoint } : { ok: false, reason: "error" };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Activar los avisos con las preferencias guardadas (desde Ajustes o la guía de Inicio). */
export function useActivatePush() {
  const [push, setPush] = usePushSettings();
  const state = usePushState();
  return async () => {
    const result = await enablePush(push.prefs, state);
    if (result.ok) setPush((current) => ({ ...current, enabled: true, endpoint: result.endpoint }));
    return result;
  };
}

/** Anula la suscripción en el teléfono y la borra del servidor. */
export async function disablePush(endpoint: string | null) {
  try {
    const sw = await navigator.serviceWorker.getRegistration();
    const subscription = await sw?.pushManager.getSubscription();
    await subscription?.unsubscribe();
    const target = endpoint ?? subscription?.endpoint;
    if (target) await post("unsubscribe", { endpoint: target });
  } catch {
    // Sin conexión: el servidor la borra solo cuando el servicio de avisos la rechace.
  }
}

export async function sendTestPush(endpoint: string) {
  try {
    return (await post("test", { endpoint })).ok;
  } catch {
    return false;
  }
}

/** Estado mínimo del día que necesita el servidor para decidir los avisos (null hasta hidratar). */
export function usePushState(): PushState | null {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const [foodLog] = useFoodLog();
  const [water] = useWater();
  const [nutrition] = useNutritionProfile();
  const weight = useLatestWeight();
  // Resolución de un minuto: el día cambia a medianoche aunque no se toque nada.
  const minute = Math.floor(useNow() / 60_000);
  return useMemo(() => {
    if (!minute) return null;
    const now = new Date(minute * 60_000);
    const today = localDateKey(now);
    const week = weekRange(now);
    const goal = Math.max(1, settings.weeklyGoal);
    const todayFood = foodLog.filter((entry) => entry.date === today);
    return {
      date: today,
      weekStart: week.start,
      trainedToday: workouts.some((workout) => workout.date === today),
      weekSessions: workouts.filter((workout) => workout.date >= week.start && workout.date <= week.end).length,
      weekGoal: goal,
      streak: weekStreak(workouts, goal, settings.pausedWeeks, now).streak,
      counting: nutrition?.mode === "count",
      loggedToday: todayFood.length > 0,
      loggedEvening: todayFood.some((entry) => entry.meal === "once" || entry.meal === "cena" || entry.meal === "colacion"),
      water: water.find((entry) => entry.date === today)?.glasses ?? 0,
      waterGoal: waterGoal(weight).glasses,
      trainingDays: cleanDays(settings.trainingDays),
    };
  }, [foodLog, minute, nutrition?.mode, settings.pausedWeeks, settings.trainingDays, settings.weeklyGoal, water, weight, workouts]);
}

/**
 * Mantiene al día el servidor con los avisos activos: envía preferencias y estado cuando cambian
 * (con una pausa breve para agrupar cambios) y al abrir la app. Si el servidor ya no conoce la
 * suscripción, la vuelve a registrar.
 */
export function PushStateSync() {
  const [push] = usePushSettings();
  const state = usePushState();
  const last = useRef<string | null>(null);
  const payload = push.enabled && push.endpoint && state ? JSON.stringify({ endpoint: push.endpoint, prefs: push.prefs, state, tz: timeZone() }) : null;

  useEffect(() => {
    if (!payload || payload === last.current) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/push/state", { method: "POST", headers: { "content-type": "application/json" }, body: payload });
        if (response.status === 404) {
          const sw = await navigator.serviceWorker.getRegistration();
          const subscription = await sw?.pushManager.getSubscription();
          if (subscription) await post("subscribe", { subscription: subscription.toJSON(), tz: timeZone(), prefs: push.prefs, state });
        }
        if (response.ok || response.status === 404) last.current = payload;
      } catch {
        // Sin conexión: se reintenta en el próximo cambio o al volver a abrir la app.
      }
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [payload, push.prefs, state]);

  return null;
}
