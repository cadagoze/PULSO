"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { beep, speak, vibrate, voiceOn } from "@/lib/feedback";
import { cancelRestPush, pushSupport, scheduleRestPush, usePushSettings } from "@/lib/push";
import { useDraft, useSettings } from "@/lib/store";
import { clockLabel, nextUpLabel } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { useCountdownCues } from "./use-countdown-cues";

/** Lo que queda visible el aviso de «descanso terminado» antes de cerrar el descanso. */
export const REST_AFTERGLOW_MS = 4000;

/** Segundos de descanso que quedan, o null si no hay uno en curso. */
function useRestLeft(restUntil: number | null) {
  // Sólo con un descanso en curso se consulta el reloj cuatro veces por segundo.
  const now = useNow(restUntil === null ? 60_000 : 250);
  if (restUntil === null || now === 0 || now >= restUntil) return null;
  return Math.ceil((restUntil - now) / 1000);
}

/** «Descanso 01:12» mientras corre el descanso; si no, `fallback`. */
export function RestStatus({ restUntil, fallback }: { restUntil: number | null; fallback: ReactNode }) {
  const left = useRestLeft(restUntil);
  return left === null ? fallback : <>Descanso <b className="num">{clockLabel(left)}</b></>;
}

/**
 * El descanso fuera de la pantalla de la sesión. En otras pantallas de PULSO suenan los mismos pitidos
 * del final. Si sales de la app, el servidor avisa a la hora exacta: en iPhone una web no puede mostrar
 * un contador en la barra de estado ni sonar en segundo plano. Al volver, ese aviso se cancela.
 */
export function RestAway() {
  const pathname = usePathname();
  const [draft, setDraft] = useDraft();
  const [settings] = useSettings();
  const [push] = usePushSettings();
  const restUntil = draft?.restUntil ?? null;
  const latest = useRef({ push, draft });

  useEffect(() => {
    latest.current = { push, draft };
  });

  // Terminado el descanso (y su aviso), se cierra en cualquier pantalla: el reloj deja de consultarse.
  useEffect(() => {
    if (restUntil === null) return;
    const timer = window.setTimeout(() => {
      setDraft((current) => (current && current.restUntil === restUntil ? { ...current, restUntil: null } : current));
    }, Math.max(0, restUntil + REST_AFTERGLOW_MS - Date.now()));
    return () => window.clearTimeout(timer);
  }, [restUntil, setDraft]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") {
        cancelRestPush();
        return;
      }
      const { push: settings, draft: current } = latest.current;
      const until = current?.restUntil ?? null;
      if (!current || until === null || current.runningSince === null || until - Date.now() < 3000) return;
      if (!settings.enabled || !settings.endpoint || settings.prefs.rest === false || pushSupport() !== "ready") return;
      scheduleRestPush(settings.endpoint, until, nextUpLabel(current.records));
    }
    // Al abrir la app (o recargarla) con un aviso pendiente, también se cancela.
    if (document.visibilityState === "visible") cancelRestPush();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // En la sesión, el anillo del descanso ya da estos avisos.
  if (restUntil === null || pathname.startsWith("/entrenar/sesion")) return null;
  return <RestCues restUntil={restUntil} sound={settings.sound} voice={voiceOn(settings)} vibration={settings.vibration} />;
}

function RestCues({ restUntil, sound, voice, vibration }: { restUntil: number; sound: boolean; voice: boolean; vibration: boolean }) {
  const now = useNow(250);
  useCountdownCues({
    key: String(restUntil),
    remainingMs: restUntil - now,
    now,
    onTen: () => {
      if (voice) speak("Quedan 10 segundos de descanso");
    },
    onTick: () => {
      if (sound) beep({ frequency: 660, duration: 0.09 });
    },
    onEnd: () => {
      if (sound) beep({ count: 3, finalLong: true });
      if (vibration) vibrate([200, 100, 200]);
    },
  });
  return null;
}
