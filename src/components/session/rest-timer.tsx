"use client";

import { Check } from "lucide-react";
import { WorkoutTimer } from "@/components/ui/workout-timer";
import { beep, speak, vibrate } from "@/lib/feedback";
import { clockLabel } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { useCountdownCues } from "./use-countdown-cues";

const AFTERGLOW_MS = 4000;

/**
 * Descanso sobre la imagen del ejercicio: anillo que se vacía, cuenta regresiva y pulso en los
 * últimos segundos. Se calcula desde `restUntil`, así que sobrevive a recargas. Al terminar queda
 * unos segundos un aviso de «descanso terminado».
 */
export function RestOverlay({ restUntil, restTotal, sound, voice = false, vibration, size, upcoming }: {
  restUntil: number | null;
  restTotal: number;
  sound: boolean;
  voice?: boolean;
  vibration: boolean;
  size: number;
  /** Lo que viene después: «Serie 3 de 4» o el siguiente ejercicio. */
  upcoming?: string;
}) {
  const now = useNow(250);
  const remainingMs = restUntil === null ? 0 : restUntil - now;

  useCountdownCues({
    key: restUntil === null ? null : String(restUntil),
    remainingMs,
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

  const visible = restUntil !== null && now !== 0 && remainingMs > -AFTERGLOW_MS;
  const finished = remainingMs <= 0;
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const total = Math.max(restTotal, seconds, 1);
  // Cambia sólo en momentos clave, para que el lector de pantalla no lea cada segundo.
  const announcement = !visible ? "" : finished ? `Descanso terminado.${upcoming ? ` Sigue: ${upcoming}.` : ""}` : seconds <= 10 ? "Quedan 10 segundos de descanso." : `Descanso de ${clockLabel(total)}.`;

  return (
    <>
      {/* El velo queda montado para oscurecer y aclarar la foto con un fundido. */}
      <span className={cn("ses-rest-scrim", visible && "is-on")} aria-hidden="true" />
      {visible && (
        <div className={cn("ses-rest", finished && "is-finished")}>
          {finished ? (
            <div className="ses-rest-done">
              <span className="ses-rest-mark" aria-hidden="true"><Check size={30} strokeWidth={2.6} /></span>
              <p className="meta">Descanso terminado</p>
              <p className="ses-rest-done-title">{upcoming ?? "A la siguiente serie"}</p>
            </div>
          ) : (
            <WorkoutTimer seconds={seconds} total={total} label="Descanso" size={size} className="ses-rest-timer">
              {upcoming && size >= 170 && <span className="ses-rest-upcoming">Sigue · {upcoming}</span>}
            </WorkoutTimer>
          )}
        </div>
      )}
      <p className="sr-only" aria-live="polite">{announcement}</p>
    </>
  );
}
