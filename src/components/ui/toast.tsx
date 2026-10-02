"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastState = { id: number; message: string; icon?: ReactNode } | null;

/**
 * Aviso breve que se oculta solo. Uno nuevo reemplaza al anterior y reinicia su animación.
 * `delay` lo muestra un poco después (por ejemplo, cuando una hoja termina de cerrarse).
 */
export function useToast(duration = 2600) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const pending = timer;
    return () => {
      if (pending.current !== null) window.clearTimeout(pending.current);
    };
  }, []);

  const show = useCallback((message: string, options: { icon?: ReactNode; delay?: number } = {}) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    const reveal = () => {
      setToast((current) => ({ id: (current?.id ?? 0) + 1, message, icon: options.icon }));
      timer.current = window.setTimeout(() => setToast(null), duration);
    };
    if (options.delay) timer.current = window.setTimeout(reveal, options.delay);
    else reveal();
  }, [duration]);

  /** Lo retira antes de tiempo (por ejemplo, al abrir una hoja). */
  const hide = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  return { toast, show, hide };
}

export function Toast({ toast, className }: { toast: ToastState; className?: string }) {
  if (!toast) return null;
  return (
    <div key={toast.id} className={cn("toast", className)} role="status">
      {toast.icon ?? <Check size={17} aria-hidden="true" />}
      <span className="toast-text">{toast.message}</span>
    </div>
  );
}
