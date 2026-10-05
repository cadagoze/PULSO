"use client";

import { useCallback, useMemo, useSyncExternalStore, type SetStateAction } from "react";

const storageEvent = "pulso:storage";
/** Valores que no se pudieron escribir en localStorage (cuota llena o acceso bloqueado). */
const memorySnapshots = new Map<string, string>();

/** Descarta la copia en memoria de una clave (tras escribirla directamente en localStorage). */
export function removePersistentMemory(key: string) {
  memorySnapshots.delete(key);
}

/** Elimina una clave del almacenamiento y de la copia en memoria, y avisa a los componentes suscritos. */
export function removePersistentKey(key: string) {
  memorySnapshots.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Sin acceso al almacenamiento sólo queda limpiar la memoria.
  }
  window.dispatchEvent(new CustomEvent(storageEvent, { detail: key }));
}

/** Clave que cambió en esta pestaña (lo escucha la sincronización con la nube). */
export const PERSISTENT_CHANGE_EVENT = storageEvent;

/**
 * Escribe un valor desde fuera de React (p. ej. lo que llega de la nube) y avisa a los componentes.
 * Devuelve `false` si no hubo espacio en el dispositivo.
 */
export function writePersistentValue(key: string, value: unknown) {
  let persisted = true;
  const snapshot = JSON.stringify(value);
  try {
    window.localStorage.setItem(key, snapshot);
    memorySnapshots.delete(key);
  } catch {
    memorySnapshots.set(key, snapshot);
    persisted = false;
  }
  window.dispatchEvent(new CustomEvent(storageEvent, { detail: key }));
  return persisted;
}

/** Valor actual de una clave (incluida la copia en memoria si no cupo en el dispositivo). */
export function readPersistentRaw(key: string) {
  const pending = memorySnapshots.get(key);
  if (pending !== undefined) return pending;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const initialSnapshot = useMemo(() => JSON.stringify(initialValue), [initialValue]);

  const subscribe = useCallback((onStoreChange: () => void) => {
    function handleChange(event: Event) {
      if (event instanceof StorageEvent) {
        if (event.key !== null && event.key !== key) return;
        // Otra pestaña escribió un valor nuevo: deja de usar la copia en memoria.
        memorySnapshots.delete(key);
      }
      if (event instanceof CustomEvent && event.detail !== key) return;
      onStoreChange();
    }
    window.addEventListener("storage", handleChange);
    window.addEventListener(storageEvent, handleChange);
    return () => {
      window.removeEventListener("storage", handleChange);
      window.removeEventListener(storageEvent, handleChange);
    };
  }, [key]);

  const getSnapshot = useCallback(() => {
    const pending = memorySnapshots.get(key);
    if (pending !== undefined) return pending;
    try {
      return window.localStorage.getItem(key) ?? initialSnapshot;
    } catch {
      return initialSnapshot;
    }
  }, [initialSnapshot, key]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => initialSnapshot);
  const value = useMemo(() => {
    try {
      return JSON.parse(snapshot) as T;
    } catch {
      return initialValue;
    }
  }, [initialValue, snapshot]);

  /** Devuelve `false` si el valor no pudo guardarse en el dispositivo (sólo queda en memoria). */
  const setValue = useCallback((next: SetStateAction<T>): boolean => {
    let current = value;
    try { current = JSON.parse(getSnapshot()) as T; } catch { /* Conserva el último estado válido. */ }
    const nextValue = typeof next === "function" ? (next as (current: T) => T)(current) : next;
    const nextSnapshot = JSON.stringify(nextValue);
    let persisted = true;
    try {
      window.localStorage.setItem(key, nextSnapshot);
      memorySnapshots.delete(key);
    } catch {
      // El estado continúa disponible en memoria durante esta sesión.
      memorySnapshots.set(key, nextSnapshot);
      persisted = false;
    }
    window.dispatchEvent(new CustomEvent(storageEvent, { detail: key }));
    return persisted;
  }, [getSnapshot, key, value]);

  return [value, setValue] as const;
}
