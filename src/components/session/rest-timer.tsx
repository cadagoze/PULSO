"use client";

import { Check } from "lucide-react";
import { ProgressRing } from "@/components/ui";
import { beep, vibrate } from "@/lib/feedback";
import { clockLabel } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { useCountdownCues } from "./use-countdown-cues";

const AFTERGLOW_MS = 4000;

/** Barra flotante del descanso. Se calcula desde `restUntil`, así que sobrevive a recargas. */
export function RestTimer({ restUntil, restTotal, sound, vibration, onAdjust, onSkip }: {
  restUntil: number | null;
  restTotal: number;
  sound: boolean;
  vibration: boolean;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}) {
  const now = useNow(250);
  const remainingMs = restUntil === null ? 0 : restUntil - now;

  useCountdownCues({
    key: restUntil === null ? null : String(restUntil),
    remainingMs,
    now,
    onTick: () => {
      if (sound) beep({ frequency: 660, duration: 0.09 });
    },
    onEnd: () => {
      if (sound) beep({ count: 3, finalLong: true });
      if (vibration) vibrate([200, 100, 200]);
    },
  });

  if (restUntil === null || now === 0 || remainingMs <= -AFTERGLOW_MS) return null;

  if (remainingMs <= 0) {
    return (
      <div className="ses-rest ses-rest-done" role="status">
        <span className="ses-rest-icon"><Check size={22} /></span>
        <div className="ses-rest-text">
          <small>Descanso terminado</small>
          <strong>A la siguiente serie</strong>
        </div>
        <button type="button" className="btn btn-dark btn-small" onClick={onSkip}>Cerrar</button>
      </div>
    );
  }

  const seconds = Math.ceil(remainingMs / 1000);
  const total = Math.max(restTotal, seconds, 1);
  const progress = (1 - remainingMs / (total * 1000)) * 100;

  return (
    <div className="ses-rest" role="timer" aria-label={`Descanso: quedan ${seconds} segundos`}>
      <ProgressRing value={progress} size={50} stroke={11} color="var(--lime)">
        <span className="ses-rest-ring-dot" />
      </ProgressRing>
      <div className="ses-rest-text">
        <small>Descanso</small>
        <strong className="num">{clockLabel(seconds)}</strong>
      </div>
      <div className="ses-rest-actions">
        <button type="button" className="ses-rest-adjust" onClick={() => onAdjust(-15)} aria-label="Restar 15 segundos">−15</button>
        <button type="button" className="ses-rest-adjust" onClick={() => onAdjust(15)} aria-label="Sumar 15 segundos">+15</button>
        <button type="button" className="btn btn-primary btn-small ses-rest-skip" onClick={onSkip}>Saltar</button>
      </div>
    </div>
  );
}
