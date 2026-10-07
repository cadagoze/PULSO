"use client";

import { useEffect, useRef } from "react";

interface CueOptions {
  /** Identifica la cuenta regresiva; al cambiar se rearma. null = inactiva. */
  key: string | null;
  remainingMs: number;
  /** 0 mientras no hay reloj (hidratación). */
  now: number;
  onTick: (secondsLeft: number) => void;
  onEnd: () => void;
  /** Aviso al quedar 10 segundos (sólo si la cuenta empezó con más de 12). */
  onTen?: () => void;
}

/**
 * Avisos de una cuenta regresiva basada en marcas de tiempo: uno a los 10 segundos, un tic en los
 * últimos 3 y un aviso final que se dispara una sola vez. Si la cuenta ya había terminado al montarse
 * (p. ej. tras recargar), no suena.
 */
export function useCountdownCues({ key, remainingMs, now, onTick, onEnd, onTen }: CueOptions) {
  const handlers = useRef({ onTick, onEnd, onTen });
  const state = useRef<{ key: string | null; last: number; armed: boolean; ended: boolean; ten: boolean }>({ key: null, last: 0, armed: false, ended: false, ten: false });

  useEffect(() => {
    handlers.current = { onTick, onEnd, onTen };
  });

  useEffect(() => {
    if (key === null || now === 0) return;
    const seconds = Math.ceil(remainingMs / 1000);
    const current = state.current;
    if (current.key !== key) {
      state.current = { key, last: seconds, armed: remainingMs > 0, ended: remainingMs <= 0, ten: seconds <= 12 };
      return;
    }
    if (!current.armed || current.ended) return;
    if (seconds !== current.last) {
      current.last = seconds;
      if (seconds >= 1 && seconds <= 3) handlers.current.onTick(seconds);
      if (seconds === 10 && !current.ten) {
        current.ten = true;
        handlers.current.onTen?.();
      }
    }
    if (remainingMs <= 0) {
      current.ended = true;
      handlers.current.onEnd();
    }
  }, [key, now, remainingMs]);
}
