"use client";

import { useCallback, useState } from "react";

/**
 * Estado de una hoja: abierta o no, sus datos y una clave que reinicia el formulario en cada apertura.
 * Los datos se conservan al cerrar, para que el contenido no desaparezca mientras la hoja baja.
 */
export function useSheet<T = true>() {
  const [state, setState] = useState<{ open: boolean; data: T | null; key: number }>({ open: false, data: null, key: 0 });
  const show = useCallback((data: T) => setState((current) => ({ open: true, data, key: current.key + 1 })), []);
  const close = useCallback(() => setState((current) => ({ ...current, open: false })), []);
  return { ...state, show, close };
}
