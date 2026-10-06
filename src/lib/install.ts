"use client";

import { useSyncExternalStore } from "react";

/**
 * Instalar PULSO en la pantalla de inicio. En Android (Chrome) el navegador ofrece un aviso que se
 * puede abrir con un botón; en iPhone se hace a mano desde Compartir, y la app instalada guarda sus
 * datos aparte de Safari (por eso antes conviene guardarlos en la nube).
 */

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export type InstallPlatform = "ios" | "android" | "desktop";
export interface InstallState { ready: boolean; standalone: boolean; platform: InstallPlatform; canPrompt: boolean; dismissed: boolean }

const DISMISS_KEY = "pulso:install-dismissed";
const DISMISS_DAYS = 30;

let deferred: InstallPromptEvent | null = null;
let installed = false;
let captured = false;
let version = 0;
const listeners = new Set<() => void>();
const serverState: InstallState = { ready: false, standalone: false, platform: "desktop", canPrompt: false, dismissed: false };
let cached: { version: number; state: InstallState } | null = null;

function notify() {
  version++;
  for (const listener of listeners) listener();
}

/** Escucha el aviso de instalación del navegador (se llama una vez al abrir la app). */
export function captureInstallPrompt() {
  if (captured || typeof window === "undefined") return;
  captured = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    notify();
  });
}

function detect(): InstallState {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const platform: InstallPlatform = ios ? "ios" : /Android/i.test(ua) ? "android" : "desktop";
  const standalone = installed || window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { ready: true, standalone, platform, canPrompt: deferred !== null, dismissed: installDismissed() };
}

function snapshot() {
  if (!cached || cached.version !== version) cached = { version, state: detect() };
  return cached.state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useInstallState() {
  return useSyncExternalStore(subscribe, snapshot, () => serverState);
}

/** Abre el aviso del navegador (Android, escritorio). Devuelve si se instaló. */
export async function promptInstall() {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const choice = await event.userChoice;
  notify();
  return choice.outcome === "accepted";
}

function installDismissed() {
  try {
    const value = window.localStorage.getItem(DISMISS_KEY);
    return value !== null && Date.now() - Number(value) < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function dismissInstall() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Sin almacenamiento, el aviso vuelve a aparecer la próxima vez.
  }
  notify();
}
