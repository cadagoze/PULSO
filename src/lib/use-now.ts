"use client";

import { useSyncExternalStore } from "react";

type Clock = {
  value: number;
  listeners: Set<() => void>;
  timer: number | null;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
};

const clocks = new Map<number, Clock>();
const getServerSnapshot = () => 0;

/** Un reloj compartido por resolución, con funciones estables para useSyncExternalStore. */
function clockFor(resolution: number): Clock {
  const existing = clocks.get(resolution);
  if (existing) return existing;
  const clock: Clock = {
    value: 0,
    listeners: new Set(),
    timer: null,
    getSnapshot: () => clock.value,
    subscribe: (listener) => {
      clock.listeners.add(listener);
      if (clock.timer === null) {
        clock.timer = window.setInterval(() => {
          clock.value = Date.now();
          clock.listeners.forEach((notify) => notify());
        }, resolution);
        // Primera lectura fuera del render: sólo avisa si la hora quedó desactualizada.
        queueMicrotask(() => {
          const now = Date.now();
          if (now - clock.value >= resolution) {
            clock.value = now;
            clock.listeners.forEach((notify) => notify());
          }
        });
      }
      return () => {
        clock.listeners.delete(listener);
        if (!clock.listeners.size && clock.timer !== null) {
          window.clearInterval(clock.timer);
          clock.timer = null;
        }
      };
    },
  };
  clocks.set(resolution, clock);
  return clock;
}

/**
 * Hora actual que vale 0 en el servidor y durante la hidratación (evita desajustes),
 * y se actualiza en el cliente cada `resolution` ms.
 */
export function useNow(resolution = 60_000) {
  const clock = clockFor(resolution);
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, getServerSnapshot);
}
