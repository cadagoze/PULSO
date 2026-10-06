/**
 * Confirmaciones con el estilo de la app (en vez de `window.confirm`, que en la app instalada muestra
 * una alerta del sistema con la dirección del sitio). `ConfirmHost` (en AppShell) las muestra.
 */

export interface ConfirmRequest {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Acción que borra o descarta: botón rojo. */
  danger?: boolean;
}

type Pending = ConfirmRequest & { id: number; resolve: (ok: boolean) => void };

let pending: Pending | null = null;
let counter = 0;
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };

/** Pide confirmación y resuelve `true` si la persona acepta. Una nueva reemplaza (y cancela) a la anterior. */
export function confirmAction(request: ConfirmRequest): Promise<boolean> {
  pending?.resolve(false);
  return new Promise((resolve) => {
    pending = { ...request, id: ++counter, resolve };
    notify();
  });
}

export function answerConfirm(ok: boolean) {
  const current = pending;
  if (!current) return;
  pending = null;
  current.resolve(ok);
  notify();
}

export const getConfirm = () => pending;
export const getServerConfirm = () => null;
export function subscribeConfirm(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
