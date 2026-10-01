"use client";

import Link from "next/link";
import { ChevronDown, Pause, Play } from "lucide-react";
import { clockLabel, durationSeconds } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import type { TrainingDraft } from "@/types";

/** Reloj de la sesión: se aísla para que sólo esta parte se vuelva a pintar cada segundo. */
export function SessionClock({ draft }: { draft: TrainingDraft }) {
  const now = useNow(1000);
  return <span className="num">{now === 0 ? "--:--" : clockLabel(durationSeconds(draft, now))}</span>;
}

export function SessionHeader({ draft, done, total, volume, onTogglePause, onFinish }: {
  draft: TrainingDraft;
  done: number;
  total: number;
  volume: string;
  onTogglePause: () => void;
  onFinish: () => void;
}) {
  const paused = draft.runningSince === null;
  const progress = total ? (done / total) * 100 : 0;
  return (
    <header className="ses-header">
      <div className="ses-header-bar">
        <Link href="/" className="btn-icon ses-header-icon" aria-label="Minimizar: el entrenamiento sigue en curso">
          <ChevronDown size={22} />
        </Link>
        <div className="ses-header-clock" aria-live="off">
          <strong className={paused ? "is-paused" : undefined}>
            <SessionClock draft={draft} />
          </strong>
          <small>
            <span className="num">{done}/{total}</span> series
            <span className="ses-dot" aria-hidden="true">·</span>
            <span className="num">{volume}</span>
          </small>
        </div>
        <button
          type="button"
          className="btn-icon ses-header-icon"
          onClick={onTogglePause}
          aria-label={paused ? "Reanudar entrenamiento" : "Pausar entrenamiento"}
          aria-pressed={paused}
        >
          {paused ? <Play size={20} /> : <Pause size={20} />}
        </button>
        <button type="button" className="btn btn-primary ses-finish-btn" onClick={onFinish}>Terminar</button>
      </div>
      <div
        className="ses-progress"
        role="progressbar"
        aria-label="Series realizadas"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
    </header>
  );
}
