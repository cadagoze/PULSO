"use client";

import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Check, Lock, PenLine } from "lucide-react";
import { ToggleChip } from "@/components/ui";
import { homeBase } from "@/data/equipment";
import { cn } from "@/lib/utils";
import type { TrainingEquipment, TrainingLocation } from "@/types";
import type { ChoiceStep, SelectionValue } from "./wellness-assessment";

const otherMax = 180;

export function NameStep({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  return (
    <form
      className="onb-name"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="sr-only" htmlFor="onb-name-input">Tu nombre</label>
      <input
        id="onb-name-input"
        className="onb-name-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tu nombre"
        autoComplete="given-name"
        enterKeyHint="next"
        maxLength={40}
      />
      <p className="onb-note"><Lock size={14} aria-hidden="true" />Tus datos quedan en este dispositivo y, si creas una cuenta, en la nube.</p>
    </form>
  );
}

/** Opción grande y táctil: se tiñe de lima suave y el check aparece con un pequeño rebote. */
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

export function ChoiceStepView({ step, selected, custom, onToggle, onCustom }: { step: ChoiceStep; selected: SelectionValue[]; custom: string; onToggle: (value: SelectionValue) => void; onCustom: (value: string) => void }) {
  const [open, setOpen] = useState(custom.length > 0);
  // Si cierras «Otro», el texto se guarda aquí y vuelve al abrirlo de nuevo.
  const saved = useRef("");
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const filled = custom.trim().length > 0;
  const fieldId = `onb-other-${step.key}`;

  function toggleOther() {
    if (open) {
      saved.current = custom;
      onCustom("");
      setOpen(false);
      return;
    }
    setOpen(true);
    if (saved.current) onCustom(saved.current);
    requestAnimationFrame(() => fieldRef.current?.focus());
  }

  return (
    <div className="onb-options" role="group" aria-labelledby="onb-step-title">
      {step.options.map((option, index) => (
        <OptionCard
          key={option.value}
          index={index}
          selected={selected.includes(option.value)}
          label={option.label}
          detail={option.detail}
          icon={option.icon}
          onClick={() => onToggle(option.value)}
        />
      ))}
      <div className={cn("onb-other", open && "is-open", filled && "is-selected")} style={{ "--i": step.options.length } as CSSProperties}>
        <button
          type="button"
          className="onb-option pressable"
          aria-expanded={open}
          aria-controls={open ? fieldId : undefined}
          onClick={toggleOther}
        >
          <span className="onb-option-icon" aria-hidden="true"><PenLine size={20} /></span>
          <span className="onb-option-text">
            <strong>Otro</strong>
            <small>{open ? "Escríbelo con tus palabras" : "Agrega una respuesta propia"}</small>
          </span>
          <span className="onb-check" aria-hidden="true">{filled && <Check size={14} strokeWidth={3} />}</span>
        </button>
        {open && (
          <div className="onb-other-field">
            <label className="sr-only" htmlFor={fieldId}>Otra respuesta (opcional)</label>
            <textarea
              id={fieldId}
              ref={fieldRef}
              value={custom}
              onChange={(event) => onCustom(event.target.value)}
              placeholder={step.otherPlaceholder}
              maxLength={otherMax}
              rows={2}
            />
            <small className="num" aria-hidden="true">{custom.length}/{otherMax}</small>
          </div>
        )}
      </div>
    </div>
  );
}

/** Cómo te identificas: una opción a la vez (elige fotos y color; se cambia en Ajustes). */
export function SexStep<T extends string>({ options, value, onChange }: { options: Array<{ value: T; label: string; detail: string; icon: ReactNode }>; value: T | null; onChange: (value: T) => void }) {
  return (
    <div className="onb-options" role="group" aria-labelledby="onb-step-title">
      {options.map((option, index) => (
        <OptionCard key={option.value} index={index} round selected={value === option.value} label={option.label} detail={option.detail} icon={option.icon} onClick={() => onChange(option.value)} />
      ))}
    </div>
  );
}

export function LocationStep({ options, location, equipment, onLocation, onEquipment }: {
  options: Array<{ value: TrainingLocation; label: string; detail: string; icon: ReactNode }>;
  location: TrainingLocation | null;
  equipment: TrainingEquipment[];
  onLocation: (value: TrainingLocation) => void;
  onEquipment: (value: TrainingEquipment[]) => void;
}) {
  function toggle(value: TrainingEquipment) {
    onEquipment(equipment.includes(value) ? equipment.filter((item) => item !== value) : [...equipment, value]);
  }
  return (
    <>
      <div className="onb-options onb-options-two" role="group" aria-labelledby="onb-step-title">
        {options.map((option, index) => (
          <OptionCard
            key={option.value}
            index={index}
            round
            selected={location === option.value}
            label={option.label}
            detail={option.detail}
            icon={option.icon}
            onClick={() => onLocation(option.value)}
          />
        ))}
      </div>
      {location === "home" && (
        <section className="onb-equipment" aria-labelledby="onb-equipment-title">
          <div className="onb-equipment-head">
            <h2 id="onb-equipment-title">¿Qué tienes en casa?</h2>
            <p>Marca lo que tengas. Si no marcas nada, entrenaremos con tu peso corporal. Después puedes agregar más en Entrenar.</p>
          </div>
          <div className="chips">
            {homeBase.map((option) => (
              <ToggleChip key={option.id} pressed={equipment.includes(option.id)} onChange={() => toggle(option.id)}>
                {option.label}
              </ToggleChip>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
