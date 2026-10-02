"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpenCheck, Calculator, Flag, Flame, Link2, ListOrdered, Plus, Replace, SlidersHorizontal, StickyNote, Timer, Trash2, Unlink2 } from "lucide-react";
import { ExerciseTechnique } from "@/components/exercises/exercise-technique";
import { Sheet, Stepper, Switch } from "@/components/ui";
import { plateBreakdown } from "@/lib/progression";
import { useSettings } from "@/lib/store";
import { isWorkingSet } from "@/lib/training";
import { cn, formatNumber } from "@/lib/utils";
import type { Exercise, ExerciseRecord, Settings } from "@/types";
import { weightLabel } from "./session-utils";

export type MenuView = "menu" | "technique" | "plates" | "rest" | "note" | "prefs";

export interface MenuTarget {
  record: ExerciseRecord;
  exercise: Exercise;
  index: number;
  count: number;
  linkedWithNext: boolean;
}

/** Acciones de la sesión que el menú de la barra superior añade bajo las del ejercicio. */
export interface MenuSessionActions {
  sessionRest: number;
  onSessionRest: (seconds: number) => void;
  onOpenSession: () => void;
  onAdd: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}

export interface ExerciseMenuProps {
  open: boolean;
  target: MenuTarget | null;
  initialView?: MenuView;
  defaultRest: number;
  loadUnit: "kg" | "lb";
  barWeight: number;
  plates: number[];
  session?: MenuSessionActions;
  onClose: () => void;
  onReplace: () => void;
  onWarmup: () => void;
  onRest: (seconds: number | undefined) => void;
  onNote: (note: string) => void;
  onMove: (direction: -1 | 1) => void;
  onSuperset: () => void;
  onDelete: () => void;
}

function MenuTile({ icon, title, detail, onClick }: { icon: ReactNode; title: string; detail?: string; onClick: () => void }) {
  return (
    <button type="button" className="ses-tile" onClick={onClick}>
      <span className="ses-tile-icon" aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      {detail && <small>{detail}</small>}
    </button>
  );
}

function MenuItem({ icon, title, detail, onClick, danger = false, disabled = false }: { icon: ReactNode; title: string; detail?: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" className={cn("ses-menu-item", danger && "is-danger")} onClick={onClick} disabled={disabled}>
      <span className="ses-menu-icon" aria-hidden="true">{icon}</span>
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
            <span key={position} className={cn("ses-plate", plateTier(plate))} style={{ height: `${36 + Math.min(1, plate / 25) * 64}%` }}>
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
      <p className="subtle ses-small">Barra de {formatNumber(barWeight)} kg. Puedes cambiar la barra y los discos en tu perfil.</p>
      {result.remainder > 0 && (
        <p className="notice warn">Con tus discos llegas a {weightLabel(result.achieved, loadUnit)}; faltan {formatNumber(result.remainder, 2)} kg.</p>
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
      <button type="button" className="btn btn-ghost btn-block" onClick={() => onSave(undefined)}>Usar el descanso general ({defaultRest} s)</button>
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

type PrefKey = "autoRest" | "sound" | "vibration" | "keepAwake";

function prefPatch(key: PrefKey, value: boolean): Partial<Settings> {
  const patch: Partial<Settings> = {};
  patch[key] = value;
  return patch;
}

/** Sonido, vibración y descanso, a mano durante la sesión (los mismos ajustes del perfil). */
function SessionPrefs({ sessionRest, onSessionRest }: { sessionRest: number; onSessionRest: (seconds: number) => void }) {
  const [settings, update] = useSettings();
  const rows: Array<{ key: PrefKey; title: string; detail: string }> = [
    { key: "autoRest", title: "Descanso automático", detail: "Empieza solo al completar una serie" },
    { key: "sound", title: "Sonido", detail: "Pitidos en los últimos segundos del descanso" },
    { key: "vibration", title: "Vibración", detail: "Al completar una serie y al terminar el descanso" },
    { key: "keepAwake", title: "Pantalla encendida", detail: "Evita que el móvil se bloquee mientras entrenas" },
  ];
  return (
    <div className="ses-prefs">
      <div className="toggle-row">
        <span><strong>Descanso general</strong><small>Para los ejercicios sin descanso propio</small></span>
        <Stepper value={sessionRest} onChange={onSessionRest} min={0} max={600} step={15} label="descanso general en segundos" format={(value) => `${value} s`} />
      </div>
      {rows.map((row) => (
        <div key={row.key} className="toggle-row">
          <span><strong>{row.title}</strong><small>{row.detail}</small></span>
          <Switch checked={settings[row.key]} onChange={(value) => update(prefPatch(row.key, value))} label={row.title} />
        </div>
      ))}
      <p className="subtle ses-small">Son los mismos ajustes de tu perfil.</p>
    </div>
  );
}

const viewTitles: Record<Exclude<MenuView, "menu">, string> = {
  technique: "Técnica",
  plates: "Calculadora de discos",
  rest: "Descanso de este ejercicio",
  note: "Nota",
  prefs: "Sonido y descanso",
};

/**
 * Opciones del ejercicio (técnica, sustitución, calentamiento, discos, descanso, nota, orden,
 * superserie, eliminar) y, desde la barra superior, también las de la sesión.
 */
export function ExerciseMenu(props: ExerciseMenuProps) {
  const { open, target, initialView = "menu", defaultRest, loadUnit, session } = props;
  const [view, setView] = useState<MenuView>(initialView);
  // Cada apertura empieza en la vista pedida (el menú sigue montado para animar la salida).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setView(initialView);
  }
  const shownView: MenuView = !target && view !== "prefs" ? "menu" : view;
  const record = target?.record;
  const exercise = target?.exercise;
  const heaviest = record ? Math.max(0, ...record.sets.filter(isWorkingSet).map((set) => set.load)) : 0;
  const restNow = record?.restSeconds ?? defaultRest;
  const title = shownView === "menu" ? exercise?.name ?? "Entrenamiento" : viewTitles[shownView];
  const eyebrow = shownView === "menu" ? (exercise ? "Opciones del ejercicio" : "Opciones") : shownView === "prefs" ? "Entrenamiento" : exercise?.name;

  return (
    <Sheet open={open} onClose={props.onClose} title={title} eyebrow={eyebrow} className="ses-menu-sheet">
      {shownView !== "menu" && (
        <button type="button" className="ses-menu-back" onClick={() => setView("menu")}>
          <ArrowLeft size={16} /> Opciones
        </button>
      )}

      {shownView === "menu" && (
        <div className="ses-menu">
          {target && record && exercise && (
            <>
              <div className="ses-tiles">
                <MenuTile icon={<BookOpenCheck size={20} />} title="Técnica" detail="Pasos y respiración" onClick={() => setView("technique")} />
                <MenuTile icon={<Replace size={20} />} title="Sustituir" detail="Mismo patrón" onClick={props.onReplace} />
                {exercise.increment > 0 && (
                  <MenuTile icon={<Flame size={20} />} title="Calentamiento" detail={heaviest > 0 ? `Hasta ${weightLabel(heaviest, loadUnit)}` : "Anota tu carga"} onClick={props.onWarmup} />
                )}
                {exercise.barbell && <MenuTile icon={<Calculator size={20} />} title="Discos" detail="Por lado de la barra" onClick={() => setView("plates")} />}
                <MenuTile icon={<Timer size={20} />} title="Descanso" detail={`${restNow} s${record.restSeconds === undefined ? " · general" : ""}`} onClick={() => setView("rest")} />
                <MenuTile icon={<StickyNote size={20} />} title={record.note ? "Editar nota" : "Nota"} detail={record.note || "Para la próxima vez"} onClick={() => setView("note")} />
              </div>
              <div className="ses-menu-group">
                <div className="ses-menu-pair">
                  <MenuItem icon={<ArrowUp size={19} />} title="Mover arriba" onClick={() => props.onMove(-1)} disabled={target.index === 0} />
                  <MenuItem icon={<ArrowDown size={19} />} title="Mover abajo" onClick={() => props.onMove(1)} disabled={target.index >= target.count - 1} />
                </div>
                {target.index < target.count - 1 && (
                  <MenuItem
                    icon={target.linkedWithNext ? <Unlink2 size={19} /> : <Link2 size={19} />}
                    title={target.linkedWithNext ? "Separar de la superserie" : "Superserie con el siguiente"}
                    detail={target.linkedWithNext ? "Vuelve a descansar entre ambos" : "Alterna ambos ejercicios sin descanso entre ellos"}
                    onClick={props.onSuperset}
                  />
                )}
                <MenuItem icon={<Trash2 size={19} />} title="Eliminar ejercicio" onClick={props.onDelete} danger />
              </div>
            </>
          )}

          {session && (
            <div className="ses-menu-group">
              <p className="meta ses-menu-label">Entrenamiento</p>
              {target && <MenuItem icon={<ListOrdered size={19} />} title="Ver sesión" detail="Todos los ejercicios, orden y notas" onClick={session.onOpenSession} />}
              <MenuItem icon={<Plus size={19} />} title="Agregar ejercicios" onClick={session.onAdd} />
              <MenuItem icon={<SlidersHorizontal size={19} />} title="Sonido y descanso" detail="Descanso automático, sonido y vibración" onClick={() => setView("prefs")} />
              <MenuItem icon={<Flag size={19} />} title="Terminar entrenamiento" detail="Esfuerzo, guardar y resumen" onClick={session.onFinish} />
              <MenuItem icon={<Trash2 size={19} />} title="Descartar entrenamiento" onClick={session.onDiscard} danger />
            </div>
          )}
        </div>
      )}

      {shownView === "technique" && exercise && <ExerciseTechnique exercise={exercise} />}
      {shownView === "plates" && <PlateCalculator initial={heaviest} barWeight={props.barWeight} plates={props.plates} loadUnit={loadUnit} />}
      {shownView === "rest" && <RestEditor key={restNow} initial={restNow} defaultRest={defaultRest} onSave={props.onRest} />}
      {shownView === "note" && <NoteEditor key={record?.note ?? ""} initial={record?.note ?? ""} onSave={props.onNote} />}
      {shownView === "prefs" && session && <SessionPrefs sessionRest={session.sessionRest} onSessionRest={session.onSessionRest} />}
    </Sheet>
  );
}
