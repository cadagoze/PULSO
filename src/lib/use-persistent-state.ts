"use client";

import { useCallback, useMemo, useSyncExternalStore, type SetStateAction } from "react";

const storageEvent = "pulso:storage";
const memorySnapshots = new Map<string, string>();

export function usePersistentState<T>(key: string, initialValue: T) {
  const initialSnapshot = useMemo(() => JSON.stringify(initialValue), [initialValue]);

  const subscribe = useCallback((onStoreChange: () => void) => {
    function handleChange(event: Event) {
      if (event instanceof StorageEvent && event.key !== key) return;
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
    try {
      return window.localStorage.getItem(key) ?? memorySnapshots.get(key) ?? initialSnapshot;
    } catch {
      return memorySnapshots.get(key) ?? initialSnapshot;
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

  const setValue = useCallback((next: SetStateAction<T>) => {
    let current = value;
    try { current = JSON.parse(getSnapshot()) as T; } catch { /* Retain the last valid state. */ }
    const nextValue = typeof next === "function" ? (next as (current: T) => T)(current) : next;
    const nextSnapshot = JSON.stringify(nextValue);
    memorySnapshots.set(key, nextSnapshot);
    try {
      window.localStorage.setItem(key, nextSnapshot);
    } catch {
      // El estado continúa disponible en memoria durante esta sesión.
    }
    window.dispatchEvent(new CustomEvent(storageEvent, { detail: key }));
  }, [getSnapshot, key, value]);

  return [value, setValue] as const;
}
