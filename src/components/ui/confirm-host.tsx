"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button, Sheet } from "@/components/ui";
import { answerConfirm, getConfirm, getServerConfirm, subscribeConfirm, type ConfirmRequest } from "@/lib/confirm";

/** Muestra la confirmación pendiente como hoja; el contenido se conserva mientras la hoja se cierra. */
export function ConfirmHost() {
  const pending = useSyncExternalStore(subscribeConfirm, getConfirm, getServerConfirm);
  const [shown, setShown] = useState<ConfirmRequest | null>(null);
  if (pending && pending !== shown) setShown(pending);
  if (typeof document === "undefined" || !shown) return null;
  return createPortal(
    <Sheet open={pending !== null} onClose={() => answerConfirm(false)} title={shown.title}>
      <div className="confirm-body">
        {shown.message && <p className="muted">{shown.message}</p>}
        <Button size="l" block variant={shown.danger ? "danger" : "primary"} onClick={() => answerConfirm(true)}>{shown.confirmLabel}</Button>
        <Button variant="ghost" block onClick={() => answerConfirm(false)}>{shown.cancelLabel ?? "Cancelar"}</Button>
      </div>
    </Sheet>,
    document.body,
  );
}
