"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check } from "lucide-react";

type ToastState = { id: number; message: string; icon?: ReactNode };

/** Aviso breve sobre la barra de navegación. Uno nuevo reemplaza al anterior y reinicia el tiempo. */
export function useToast(duration = 2500) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | null>(null);

  const show = useCallback((message: string, icon?: ReactNode) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message, icon }));
    timer.current = window.setTimeout(() => setToast(null), duration);
  }, [duration]);

  /** Lo retira antes de tiempo (por ejemplo al abrir una hoja, para no tapar su botón). */
  const hide = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  useEffect(() => {
    const pending = timer;
    return () => {
      if (pending.current !== null) window.clearTimeout(pending.current);
    };
  }, []);

  return [toast, show, hide] as const;
}

export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div key={toast.id} className="toast" role="status">
      {toast.icon ?? <Check size={17} />}
      {toast.message}
    </div>
  );
}
