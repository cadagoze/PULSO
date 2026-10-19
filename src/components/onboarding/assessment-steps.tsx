"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Check, Plus } from "lucide-react";
import { SegmentedControl, ToggleChip } from "@/components/ui";
import { equipmentFor, simpleEquipment } from "@/data/equipment";
import { dayOptions, minuteOptions } from "@/lib/assessment";
import { cn } from "@/lib/utils";
import type { TrainingEquipment } from "@/types";

/** Opción grande y táctil: se marca con el check y un pequeño rebote. */
function OptionCard({ selected, label, detail, icon, onClick, round = false, index }: { selected: boolean; label: string; detail: string; icon: ReactNode; onClick: () => void; round?: boolean; index: number }) {
  return (
    <button
      type="button"
      className={cn("onb-option pressable", selected && "is-selected")}
      style={{ "--i": index } as CSSProperties}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="onb-option-icon" aria-hidden="true">{icon}</span>
      <span className="onb-option-text">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className={cn("onb-check", round && "is-round")} aria-hidden="true">
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}

/** Opciones de un paso: `round` para elegir una sola, cuadradas para marcar varias. */
export function OptionList<T extends string>({ options, isSelected, onPick, round = false }: {
  options: Array<{ value: T; label: string; detail: string; icon: ReactNode }>;
  isSelected: (value: T) => boolean;
  onPick: (value: T) => void;
  round?: boolean;
}) {
  return (
    <div className="onb-options" role="group" aria-labelledby="onb-step-title">
      {options.map((option, index) => (
        <OptionCard key={option.value} index={index} round={round} selected={isSelected(option.value)} label={option.label} detail={option.detail} icon={option.icon} onClick={() => onPick(option.value)} />
      ))}
    </div>
  );
}

/** Lo que hay en casa: «Sin equipamiento», lo más común y, si hace falta, el resto del catálogo. */
export function EquipmentStep({ value, onChange }: { value: TrainingEquipment[]; onChange: (value: TrainingEquipment[]) => void }) {
  const simpleIds = simpleEquipment.map((item) => item.id);
  const extra = equipmentFor("home").filter((item) => !simpleIds.includes(item.id));
  const [more, setMore] = useState(() => value.some((id) => !simpleIds.includes(id)));

  function toggle(id: TrainingEquipment) {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  }

  return (
    <div className="onb-equipment">
      <div className="chips" role="group" aria-labelledby="onb-step-title">
        <ToggleChip pressed={value.length === 0} onChange={() => onChange([])}>Sin equipamiento</ToggleChip>
        {simpleEquipment.map((item) => (
          <ToggleChip key={item.id} pressed={value.includes(item.id)} onChange={() => toggle(item.id)}>{item.label}</ToggleChip>
        ))}
        {!more && (
          <button type="button" className="chip equip-more" onClick={() => setMore(true)}>
            <Plus size={14} strokeWidth={2.6} aria-hidden="true" />Más equipamiento
          </button>
        )}
      </div>
      {more && (
        <div className="chips onb-equipment-more" role="group" aria-label="Más equipamiento">
          {extra.map((item) => (
            <ToggleChip key={item.id} pressed={value.includes(item.id)} onChange={() => toggle(item.id)}>{item.label}</ToggleChip>
          ))}
        </div>
      )}
      <p className="onb-note">Sin equipamiento entrenamos con tu peso corporal. Después lo ajustas en Entrenar.</p>
    </div>
  );
}

/** Días por semana y minutos por sesión: el punto de partida, que cada día se puede ajustar. */
export function TimeStep({ days, minutes, onDays, onMinutes }: { days: number; minutes: number; onDays: (value: number) => void; onMinutes: (value: number) => void }) {
  return (
    <div className="onb-time">
      <div className="onb-time-row">
        <span className="onb-time-label">Días por semana</span>
        <SegmentedControl size="l" label="Días por semana" options={dayOptions.map((value) => ({ value: String(value), label: String(value) }))} value={String(days)} onChange={(value) => onDays(Number(value))} />
      </div>
      <div className="onb-time-row">
        <span className="onb-time-label">Minutos por sesión</span>
        <SegmentedControl size="l" label="Minutos por sesión" options={minuteOptions.map((value) => ({ value: String(value), label: `${value} min` }))} value={String(minutes)} onChange={(value) => onMinutes(Number(value))} />
      </div>
      <p className="onb-note">Cada día puedes pedir una sesión más corta o más larga en Entrenar.</p>
    </div>
  );
}
