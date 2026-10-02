"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

type ToastState = { id: number; message: string } | null;

/** Aviso breve que se oculta solo. Repetir el mismo mensaje vuelve a animarlo. */
export function useToast(duration = 2800) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<number | null>(null);
  const counter = useRef(0);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const show = useCallback((message: string) => {
    counter.current += 1;
    setToast({ id: counter.current, message });
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), duration);
  }, [duration]);

  return { toast, show };
}

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div key={toast.id} className="toast" role="status">
      <Check size={17} aria-hidden="true" /> {toast.message}
    </div>
  );
}
