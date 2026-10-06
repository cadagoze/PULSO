"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Play, Trash2 } from "lucide-react";
import { Button, ButtonLink, Sheet } from "@/components/ui";
import { useDraft } from "@/lib/store";
import { completedSets, durationSeconds, totalSets } from "@/lib/training";

// Pedido de «Terminar y guardar» desde fuera de la sesión: la sesión lo lee al montarse.
let finishRequested = false;
export const finishRequestPending = () => finishRequested;
export function clearFinishRequest() {
  finishRequested = false;
}

/** Pausar o reanudar el reloj del entrenamiento en curso, y descartarlo, desde fuera de la sesión. */
export function useDraftControls() {
  const [draft, setDraft] = useDraft();

  function togglePause() {
    const now = Date.now();
    setDraft((current) => {
      if (!current) return current;
      return current.runningSince === null
        ? { ...current, runningSince: now }
        : { ...current, elapsedSeconds: durationSeconds(current, now), runningSince: null, restUntil: null };
    });
  }

  return { draft, paused: draft?.runningSince === null, togglePause, discard: () => setDraft(null) };
}

/**
 * Terminar el entrenamiento en curso: guardarlo (abre la sesión con la hoja de guardar) o
 * descartarlo con una segunda confirmación. Sin series hechas, sólo se puede descartar.
 */
export function DraftEndSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { draft, discard } = useDraftControls();
  const [confirming, setConfirming] = useState(false);
  const done = draft ? completedSets(draft.records) : 0;
  const total = draft ? totalSets(draft.records) : 0;

  function close() {
    setConfirming(false);
    onClose();
  }

  // Se monta en <body>: así ninguna tarjeta con foto o barra fija descoloca la hoja.
  if (typeof document === "undefined") return null;
  return createPortal(
    <Sheet open={open && Boolean(draft)} onClose={close} eyebrow="Entrenamiento en curso" title="¿Terminar o descartar?">
      <div className="draft-end">
        <p className="muted">
          {draft?.name} · <span className="num">{done}</span> de <span className="num">{total}</span> series hechas.
        </p>
        {done > 0
          ? <ButtonLink href="/entrenar/sesion?terminar=1" size="l" block onClick={() => { finishRequested = true; close(); }}><Check size={18} />Terminar y guardar</ButtonLink>
          : <p className="draft-end-note">Aún no completas ninguna serie: no hay nada que guardar.</p>}
        {confirming ? (
          <div className="draft-end-confirm" role="alert">
            <p>Se perderán las series de esta sesión. Tu historial no cambia.</p>
            <Button variant="danger" size="l" block onClick={() => { discard(); close(); }}><Trash2 size={18} />Sí, descartar</Button>
          </div>
        ) : (
          <Button variant="danger" size="l" block onClick={() => setConfirming(true)}><Trash2 size={18} />Descartar entrenamiento</Button>
        )}
        <Button variant="ghost" block onClick={close}><Play size={16} />Seguir entrenando</Button>
      </div>
    </Sheet>,
    document.body,
  );
}
