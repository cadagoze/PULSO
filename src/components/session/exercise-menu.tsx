"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpenCheck, Calculator, Flame, Link2, Replace, StickyNote, Timer, Trash2, Unlink2 } from "lucide-react";
import { ExerciseTechnique } from "@/components/exercises/exercise-technique";
import { Sheet, Stepper } from "@/components/ui";
import { plateBreakdown } from "@/lib/progression";
import { isWorkingSet } from "@/lib/training";
import { cn, formatNumber } from "@/lib/utils";
import type { Exercise, ExerciseRecord } from "@/types";
import { weightLabel } from "./session-utils";

type View = "menu" | "technique" | "plates" | "rest" | "note";

export interface ExerciseMenuProps {
  record: ExerciseRecord;
  exercise: Exercise;
  index: number;
  count: number;
  linkedWithNext: boolean;
  defaultRest: number;
  loadUnit: "kg" | "lb";
  barWeight: number;
  plates: number[];
  onClose: () => void;
  onReplace: () => void;
  onWarmup: () => void;
  onRest: (seconds: number | undefined) => void;
  onNote: (note: string) => void;
  onMove: (direction: -1 | 1) => void;
  onSuperset: () => void;
  onDelete: () => void;
}

function MenuItem({ icon, title, detail, onClick, danger = false, disabled = false }: { icon: ReactNode; title: string; detail?: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" className={cn("ses-menu-item", danger && "is-danger")} onClick={onClick} disabled={disabled}>
      <span className="ses-menu-icon">{icon}</span>
      <span className="grow">
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
      </span>
    </button>
  );
}

function plateTier(plate: number) {
  if (plate >= 25) return "t1";
  if (plate >= 20) return "t2";
  if (plate >= 15) return "t3";
  if (plate >= 10) return "t4";
  if (plate >= 5) return "t5";
  return "t6";
}

function PlateCalculator({ initial, barWeight, plates, loadUnit }: { initial: number; barWeight: number; plates: number[]; loadUnit: "kg" | "lb" }) {
  const [target, setTarget] = useState(Math.max(barWeight, initial));
  const result = plateBreakdown(target, barWeight, plates);
  return (
    <div className="stack">
      <div className="spread">
        <span className="muted">Carga total</span>
        <Stepper value={target} onChange={setTarget} min={barWeight} max={500} step={2.5} label="carga total" format={(value) => weightLabel(value, loadUnit)} />
      </div>

      <div className="ses-barbell" role="img" aria-label={result.perSide.length ? `Por lado: ${result.perSide.map((plate) => formatNumber(plate, 2)).join(", ")} kg` : "Sólo la barra"}>
        <span className="ses-bar-sleeve" />
        <span className="ses-bar-collar" />
        <div className="ses-bar-plates">
          {result.perSide.map((plate, position) => (
            <span
              key={position}
              className={cn("ses-plate", plateTier(plate))}
              style={{ height: `${36 + Math.min(1, plate / 25) * 64}%` }}
            >
              <i className="num">{formatNumber(plate, 2)}</i>
            </span>
          ))}
        </div>
        <span className="ses-bar-shaft" />
      </div>

      <p className="ses-plate-summary">
        {result.perSide.length
          ? <>Por lado: <b className="num">{result.perSide.map((plate) => formatNumber(plate, 2)).join(" + ")}</b> kg</>
          : "Sólo la barra, sin discos."}
      </p>
      <p className="subtle ses-small">
        Barra de {formatNumber(barWeight)} kg. Puedes cambiar la barra y los discos en tu perfil.
      </p>
      {result.remainder > 0 && (
        <p className="notice warn">
          Con tus discos llegas a {weightLabel(result.achieved, loadUnit)}; faltan {formatNumber(result.remainder, 2)} kg.
        </p>
      )}
    </div>
  );
}

function RestEditor({ initial, defaultRest, onSave }: { initial: number; defaultRest: number; onSave: (seconds: number | undefined) => void }) {
  const [seconds, setSeconds] = useState(initial);
  return (
    <div className="stack">
      <div className="spread">
        <span className="muted">Descanso tras cada serie</span>
        <Stepper value={seconds} onChange={setSeconds} min={0} max={600} step={15} label="descanso en segundos" format={(value) => `${value} s`} />
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={() => onSave(seconds)}>Guardar descanso</button>
      <button type="button" className="btn btn-ghost btn-block" onClick={() => onSave(undefined)}>
        Usar el descanso general ({defaultRest} s)
      </button>
    </div>
  );
}

function NoteEditor({ initial, onSave }: { initial: string; onSave: (note: string) => void }) {
  const [note, setNote] = useState(initial);
  return (
    <div className="stack">
      <label className="field">
        Nota del ejercicio
        <textarea value={note} maxLength={300} placeholder="Agarre, altura del banco, sensaciones…" onChange={(event) => setNote(event.target.value)} />
      </label>
      <button type="button" className="btn btn-primary btn-block" onClick={() => onSave(note.trim())}>Guardar nota</button>
    </div>
  );
}

const viewTitles: Record<Exclude<View, "menu">, string> = {
  technique: "Técnica",
  plates: "Calculadora de discos",
  rest: "Descanso de este ejercicio",
  note: "Nota",
};

/** Hoja "⋯" de un ejercicio: técnica, sustitución, calentamiento, discos, descanso, nota y orden. */
export function ExerciseMenu(props: ExerciseMenuProps) {
  const { record, exercise, index, count, linkedWithNext, defaultRest, loadUnit } = props;
  const [view, setView] = useState<View>("menu");
  const workingLoads = record.sets.filter(isWorkingSet).map((set) => set.load);
  const heaviest = Math.max(0, ...workingLoads);
  const restNow = record.restSeconds ?? defaultRest;

  return (
    <Sheet open onClose={props.onClose} title={view === "menu" ? exercise.name : viewTitles[view]} eyebrow={view === "menu" ? "Opciones del ejercicio" : exercise.name} className="ses-menu-sheet">
      {view !== "menu" && (
        <button type="button" className="ses-menu-back" onClick={() => setView("menu")}>
          <ArrowLeft size={16} /> Opciones
        </button>
      )}

      {view === "menu" && (
        <div className="ses-menu">
          <MenuItem icon={<BookOpenCheck size={19} />} title="Ver técnica" detail="Pasos, respiración y versión más fácil" onClick={() => setView("technique")} />
          <MenuItem icon={<Replace size={19} />} title="Sustituir" detail="Alternativas del mismo patrón" onClick={props.onReplace} />
          {exercise.increment > 0 && (
            <MenuItem icon={<Flame size={19} />} title="Agregar series de calentamiento" detail={heaviest > 0 ? `Aproximación a ${weightLabel(heaviest, loadUnit)}` : "Primero anota tu carga de trabajo"} onClick={props.onWarmup} />
          )}
          {exercise.barbell && (
            <MenuItem icon={<Calculator size={19} />} title="Calculadora de discos" detail="Qué poner en cada lado de la barra" onClick={() => setView("plates")} />
          )}
          <MenuItem icon={<Timer size={19} />} title="Descanso de este ejercicio" detail={`${restNow} s${record.restSeconds === undefined ? " · general" : ""}`} onClick={() => setView("rest")} />
          <MenuItem icon={<StickyNote size={19} />} title={record.note ? "Editar nota" : "Nota"} detail={record.note || "Un recordatorio para la próxima vez"} onClick={() => setView("note")} />
          <div className="ses-menu-pair">
            <MenuItem icon={<ArrowUp size={19} />} title="Mover arriba" onClick={() => props.onMove(-1)} disabled={index === 0} />
            <MenuItem icon={<ArrowDown size={19} />} title="Mover abajo" onClick={() => props.onMove(1)} disabled={index >= count - 1} />
          </div>
          {index < count - 1 && (
            <MenuItem
              icon={linkedWithNext ? <Unlink2 size={19} /> : <Link2 size={19} />}
              title={linkedWithNext ? "Separar de la superserie" : "Superserie con el siguiente"}
              detail={linkedWithNext ? "Vuelve a descansar entre ambos" : "Alterna ambos ejercicios sin descanso entre ellos"}
              onClick={props.onSuperset}
            />
          )}
          <MenuItem icon={<Trash2 size={19} />} title="Eliminar ejercicio" onClick={props.onDelete} danger />
        </div>
      )}

      {view === "technique" && <ExerciseTechnique exercise={exercise} />}
      {view === "plates" && <PlateCalculator initial={heaviest} barWeight={props.barWeight} plates={props.plates} loadUnit={loadUnit} />}
      {view === "rest" && <RestEditor initial={restNow} defaultRest={defaultRest} onSave={props.onRest} />}
      {view === "note" && <NoteEditor initial={record.note ?? ""} onSave={props.onNote} />}
    </Sheet>
  );
}
