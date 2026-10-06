"use client";

import { Check, Ellipsis, Flag, Link2, Plus, Trash2 } from "lucide-react";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { MetaLine, ProgressBar, Sheet } from "@/components/ui";
import { exerciseById } from "@/lib/training";
import { cn } from "@/lib/utils";
import type { TrainingDraft } from "@/types";
import { SessionClock } from "./session-header";
import { sourceLabel, supersetLetters } from "./session-utils";

/**
 * «Ver sesión»: el entrenamiento completo. Saltar a un ejercicio, abrir sus opciones (orden,
 * superserie, eliminar…), agregar ejercicios, renombrar, notas, terminar o descartar.
 */
export function SessionSheet({ open, onClose, draft, current, done, total, volume, onRename, onRenameBlur, onNotes, onJump, onMenu, onAdd, onFinish, onDiscard }: {
  open: boolean;
  onClose: () => void;
  draft: TrainingDraft;
  current: number;
  done: number;
  total: number;
  volume: string;
  onRename: (name: string) => void;
  onRenameBlur: () => void;
  onNotes: (notes: string) => void;
  onJump: (index: number) => void;
  onMenu: (index: number) => void;
  onAdd: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}) {
  const letters = supersetLetters(draft.records);
  return (
    <Sheet open={open} onClose={onClose} title="Tu sesión" eyebrow={sourceLabel(draft.source)} className="ses-plan-sheet">
      <div className="ses-plan-intro">
        <input
          className="ses-plan-name"
          value={draft.name}
          maxLength={60}
          aria-label="Nombre del entrenamiento"
          onChange={(event) => onRename(event.target.value)}
          onBlur={onRenameBlur}
        />
        <MetaLine items={[<SessionClock key="clock" draft={draft} />, <><b className="num">{done}/{total}</b> series</>, <b key="volume" className="num">{volume}</b>]} />
        <ProgressBar value={total ? (done / total) * 100 : 0} label="Series realizadas" />
      </div>

      {draft.records.length > 0 && (
        <ol className="ses-plan-list" aria-label="Ejercicios de la sesión">
          {draft.records.map((record, index) => {
            const exercise = exerciseById(record.exerciseId);
            if (!exercise) return null;
            const setsDone = record.sets.filter((set) => set.done).length;
            const complete = setsDone === record.sets.length && record.sets.length > 0;
            const group = record.group;
            const first = Boolean(group) && draft.records[index - 1]?.group !== group;
            const lastInGroup = Boolean(group) && draft.records[index + 1]?.group !== group;
            const linked = Boolean(group) && (draft.records[index - 1]?.group === group || draft.records[index + 1]?.group === group);
            return (
              <li key={`${record.exerciseId}-${index}`} className={cn("ses-plan-item", linked && "is-linked", linked && first && "is-group-first", linked && lastInGroup && "is-group-last", index === current && "is-current", complete && "is-complete")}>
                {linked && first && group && <p className="ses-plan-group"><Link2 size={13} aria-hidden="true" />Superserie {letters.get(group)} · alterna sin descanso</p>}
                <div className="ses-plan-row">
                  <button type="button" className="ses-plan-main" onClick={() => onJump(index)} aria-current={index === current ? "step" : undefined}>
                    <span className="ses-plan-index num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <ExerciseVisual exercise={exercise} size="thumb" />
                    <span className="ses-plan-text">
                      <strong>{exercise.name}</strong>
                      <small>
                        {index === current && <span className="ses-plan-now">Ahora</span>}
                        <span className="num">{setsDone}/{record.sets.length}</span> series
                      </small>
                    </span>
                    {complete && <span className="ses-plan-check" aria-label="Completado"><Check size={15} strokeWidth={3} /></span>}
                  </button>
                  <button type="button" className="ses-icon-btn" onClick={() => onMenu(index)} aria-label={`Opciones de ${exercise.name}`}>
                    <Ellipsis size={20} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <button type="button" className="ses-ghost ses-plan-add" onClick={onAdd}><Plus size={18} /> Agregar ejercicios</button>

      <label className="field">
        Notas de la sesión
        <textarea
          value={draft.notes}
          maxLength={1000}
          placeholder="Cómo te sentiste, ajustes de técnica, energía…"
          onChange={(event) => onNotes(event.target.value)}
        />
      </label>
      <p className="subtle ses-small">Se guarda sólo en este dispositivo mientras entrenas.</p>

      <div className="ses-plan-actions">
        <button type="button" className={cn("btn btn-block", done > 0 && done === total ? "btn-primary" : "btn-secondary")} onClick={onFinish}>
          <Flag size={17} /> Terminar entrenamiento
        </button>
        <button type="button" className="ses-discard" onClick={onDiscard}><Trash2 size={16} /> Descartar entrenamiento</button>
      </div>
    </Sheet>
  );
}
