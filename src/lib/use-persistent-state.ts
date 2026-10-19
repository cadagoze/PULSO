"use client";

import { useCallback, useMemo, useSyncExternalStore, type SetStateAction } from "react";

const storageEvent = "pulso:storage";
/** Valores que no se pudieron escribir en localStorage (cuota llena o acceso bloqueado). */
const memorySnapshots = new Map<string, string>();
/**
 * Último texto leído de localStorage por clave. Muchas pantallas leen la misma clave (entrenamientos,
 * comidas) en cada render: así se lee una vez y se actualiza al escribir o al cambiar en otra pestaña.
 */
const rawCache = new Map<string, string | null>();
/** Último valor decodificado por clave: el mismo texto devuelve el mismo objeto, sin volver a hacer JSON.parse. */
const parsedCache = new Map<string, { snapshot: string; value: unknown }>();

// Otra pestaña cambió algo: lo leído en memoria deja de valer (una vez, para todas las claves afectadas).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === null) rawCache.clear();
    else rawCache.delete(event.key);
  });
}

function readStored(key: string): string | null {
  const pending = memorySnapshots.get(key);
  if (pending !== undefined) return pending;
  if (rawCache.has(key)) return rawCache.get(key) ?? null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = null;
  }
  rawCache.set(key, raw);
  return raw;
}

function parseSnapshot<T>(key: string, snapshot: string, fallback: T): T {
  const cached = parsedCache.get(key);
  if (cached && cached.snapshot === snapshot) return cached.value as T;
  try {
    const value = JSON.parse(snapshot) as T;
    parsedCache.set(key, { snapshot, value });
    return value;
  } catch {
    return fallback;
  }
}

/** Descarta la copia en memoria de una clave (tras escribirla directamente en localStorage). */
export function removePersistentMemory(key: string) {
  memorySnapshots.delete(key);
  rawCache.delete(key);
}

/** Elimina una clave del almacenamiento y de la copia en memoria, y avisa a los componentes suscritos. */
export function removePersistentKey(key: string) {
  memorySnapshots.delete(key);
  rawCache.delete(key);
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
    rawCache.set(key, snapshot);
  } catch {
    memorySnapshots.set(key, snapshot);
    persisted = false;
  }
  window.dispatchEvent(new CustomEvent(storageEvent, { detail: key }));
  return persisted;
}

/** Valor actual de una clave (incluida la copia en memoria si no cupo en el dispositivo). */
export function readPersistentRaw(key: string) {
  return readStored(key);
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const initialSnapshot = useMemo(() => JSON.stringify(initialValue), [initialValue]);

  const subscribe = useCallback((onStoreChange: () => void) => {
    function handleChange(event: Event) {
      if (event instanceof StorageEvent) {
        if (event.key !== null && event.key !== key) return;
        // Otra pestaña escribió un valor nuevo: deja de usar las copias en memoria.
        memorySnapshots.delete(key);
        rawCache.delete(key);
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

  const getSnapshot = useCallback(() => readStored(key) ?? initialSnapshot, [initialSnapshot, key]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => initialSnapshot);
  const value = useMemo(() => parseSnapshot(key, snapshot, initialValue), [initialValue, key, snapshot]);

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
      rawCache.set(key, nextSnapshot);
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
