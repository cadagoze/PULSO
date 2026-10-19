"use client";

import { useSyncExternalStore } from "react";

const subscribeNothing = () => () => {};

/** Verdadero sólo en el cliente tras hidratar: evita mostrar el estado vacío antes de leer localStorage. */
export function useHydrated() {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}
