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

let speechPrimed = false;

/** Desbloquea el audio y la voz en iOS: llamar dentro de un gesto del usuario (p. ej. al iniciar la sesión). */
export function primeAudio() {
  context();
  if (speechPrimed || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    // Una frase vacía dentro del toque habilita las siguientes, que llegan sin gesto.
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    speechPrimed = true;
  } catch {
    // Sin voz: se sigue con sonido y vibración.
  }
}

/** Voz en español; primero la latinoamericana (Chile, México, EE. UU.), si el equipo la tiene. */
function spanishVoice() {
  const voices = window.speechSynthesis.getVoices();
  for (const lang of ["es-CL", "es-419", "es-MX", "es-US", "es-ES"]) {
    const voice = voices.find((item) => item.lang.replace("_", "-") === lang);
    if (voice) return voice;
  }
  return voices.find((item) => item.lang.toLowerCase().startsWith("es")) ?? null;
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

/**
 * Metrónomo con el reloj de audio: programa cada golpe un poco antes, así el ritmo no se atrasa aunque
 * la pantalla vaya lenta. El primer golpe de cada `accentEvery` suena más agudo. Devuelve cómo detenerlo.
 */
export function startMetronome(bpm: number, accentEvery = 4) {
  const ctx = context();
  if (!ctx) return () => undefined;
  const interval = 60 / bpm;
  let next = ctx.currentTime + 0.05;
  let beat = 0;
  const schedule = () => {
    while (next < ctx.currentTime + 0.3) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = beat % accentEvery === 0 ? 1320 : 990;
      gain.gain.setValueAtTime(0.0001, next);
      gain.gain.exponentialRampToValueAtTime(0.12, next + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, next + 0.05);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(next);
      oscillator.stop(next + 0.06);
      next += interval;
      beat += 1;
    }
  };
  schedule();
  const timer = window.setInterval(schedule, 100);
  return () => window.clearInterval(timer);
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
    const voice = spanishVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "es-ES";
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
