"use client";

import { useSyncExternalStore } from "react";

/**
 * Las pantallas enlazadas se precargan recién cuando la página terminó de cargar y el navegador está
 * libre: así, en una red móvil, la precarga no le quita velocidad a la portada ni a las fuentes.
 */
let ready = false;
let started = false;
const listeners = new Set<() => void>();

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const open = () => {
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 1));
    window.setTimeout(() => idle(() => {
      ready = true;
      for (const listener of listeners) listener();
    }, { timeout: 3000 }), 1500);
  };
  if (document.readyState === "complete") open();
  else window.addEventListener("load", open, { once: true });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function usePrefetchReady() {
  return useSyncExternalStore(subscribe, () => ready, () => false);
}
