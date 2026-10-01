"use client";

import { useEffect } from "react";

let audioContext: AudioContext | null = null;

function context() {
  if (typeof window === "undefined") return null;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

/** Desbloquea el audio en iOS: llamar dentro de un gesto del usuario (p. ej. al iniciar la sesión). */
export function primeAudio() {
  context();
}

/** Pitido corto. `count` repite el tono; el último puede ser más largo para marcar el final. */
export function beep({ count = 1, frequency = 880, duration = 0.12, finalLong = false }: { count?: number; frequency?: number; duration?: number; finalLong?: boolean } = {}) {
  const ctx = context();
  if (!ctx) return;
  for (let index = 0; index < count; index += 1) {
    const start = ctx.currentTime + index * 0.22;
    const length = finalLong && index === count - 1 ? duration * 3 : duration;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = finalLong && index === count - 1 ? frequency * 1.5 : frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + length + 0.02);
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // iOS Safari no admite vibración; se ignora.
  }
}

/** Indicaciones habladas en español, si el navegador las admite. */
export function speak(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Sin síntesis de voz, la sesión continúa con sonido y vibración.
  }
}

/** Mantiene la pantalla encendida mientras `active` sea verdadero (Screen Wake Lock API). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) void sentinel.release();
      } catch {
        // Puede fallar con batería baja o pestaña oculta; se reintenta al volver.
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible" && !cancelled) void request(); };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [active]);
}
