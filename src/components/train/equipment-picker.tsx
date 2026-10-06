"use client";

import { Fragment, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { Button, SegmentedControl, Sheet, ToggleChip } from "@/components/ui";
import { placeOptions } from "@/components/train/shared";
import { equipmentById, equipmentCategoryLabels, equipmentFor, fullGym, type EquipmentCategory, type EquipmentItem } from "@/data/equipment";
import { usePreference, useSettings } from "@/lib/store";
import { formatNumber, toDisplayWeight } from "@/lib/utils";
import type { TrainingEquipment, TrainingLocation } from "@/types";

const categories = Object.keys(equipmentCategoryLabels) as EquipmentCategory[];

/** Lo marcado para un lugar (casa o gimnasio) y cómo cambiarlo. */
export function useEquipment(place: TrainingLocation) {
  const [preference, setPreference] = usePreference();
  const selected = place === "gym" ? preference.gymEquipment ?? fullGym : preference.equipment;

  function set(next: TrainingEquipment[]) {
    setPreference((current) => (place === "gym" ? { ...current, gymEquipment: next } : { ...current, equipment: next }));
  }

  function toggle(id: TrainingEquipment) {
    set(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  return { selected, set, toggle };
}

/** «3 equipos», «Sólo peso corporal», «Gimnasio completo», «12 de 21». */
export function equipmentCount(place: TrainingLocation, selected: TrainingEquipment[]) {
  if (place === "home") return selected.length ? `${selected.length} ${selected.length === 1 ? "equipo" : "equipos"}` : "Sólo peso corporal";
  const total = equipmentFor("gym").length;
  return selected.length === total && fullGym.every((id) => selected.includes(id)) ? "Gimnasio completo" : `${selected.length} de ${total}`;
}

/**
 * Chips de equipamiento: la lista base del lugar más lo que agregaste, y «Más equipamiento» para
 * abrir el catálogo completo por categoría.
 */
export function EquipmentChips({ place, className }: { place: TrainingLocation; className?: string }) {
  const { selected, toggle } = useEquipment(place);
  const [open, setOpen] = useState(false);
  // En casa: la base y lo que agregaste. En el gimnasio (todo marcado por defecto): sólo la base;
  // lo demás se ajusta en el catálogo para no llenar la pantalla de chips.
  const visible = equipmentFor(place).filter((item) => item.base.includes(place) || (place === "home" && selected.includes(item.id)));
  const hidden = place === "gym" ? selected.filter((id) => !visible.some((item) => item.id === id)).length : 0;

  return (
    <>
      <div className={className ?? "chips train-chips"} role="group" aria-label={place === "home" ? "Equipamiento en casa" : "Equipamiento del gimnasio"}>
        {visible.map((item) => (
          <ToggleChip key={item.id} pressed={selected.includes(item.id)} onChange={() => toggle(item.id)}>{item.label}</ToggleChip>
        ))}
        <button type="button" className="chip equip-more" onClick={() => setOpen(true)}>
          <Plus size={14} strokeWidth={2.6} aria-hidden="true" />{hidden > 0 ? `${hidden} más` : "Más equipamiento"}
        </button>
      </div>
      <EquipmentSheet place={place} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Lista agrupada de todo el equipamiento de un lugar: se marca y desmarca al instante. */
export function EquipmentList({ place }: { place: TrainingLocation }) {
  const { selected, toggle } = useEquipment(place);
  const items = equipmentFor(place);
  return (
    <>
      {categories.map((category) => {
        const group = items.filter((item) => item.category === category);
        if (!group.length) return null;
        return (
          <section key={category} className="equip-group" aria-label={equipmentCategoryLabels[category]}>
            <h3 className="meta">{equipmentCategoryLabels[category]}</h3>
            <div className="equip-list">
              {group.map((item) => {
                const pressed = selected.includes(item.id);
                return (
                  <Fragment key={item.id}>
                    <button type="button" className="equip-row" aria-pressed={pressed} onClick={() => toggle(item.id)}>
                      <span className="grow">
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </span>
                      <span className="equip-check" aria-hidden="true" />
                    </button>
                    {place === "home" && pressed && item.loads && <LoadPicker item={item} />}
                  </Fragment>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

/**
 * Pesos de un equipo que tienes en casa: cada mancuerna o kettlebell que tengas, o el máximo total
 * en barra y set unible. Con eso la rutina elige cargas, repeticiones y series.
 */
function LoadPicker({ item }: { item: EquipmentItem }) {
  const [preference, setPreference] = usePreference();
  const [settings] = useSettings();
  const config = item.loads;
  if (!config) return null;
  const values = preference.loads?.[item.id] ?? [];
  const label = (kg: number) => `${formatNumber(toDisplayWeight(kg, settings.unit))}${config.mode === "max" && kg === config.options.at(-1) ? "+" : ""} ${settings.unit}`;

  function choose(kg: number) {
    const next = config?.mode === "max" ? (values.includes(kg) ? [] : [kg]) : values.includes(kg) ? values.filter((value) => value !== kg) : [...values, kg].sort((a, b) => a - b);
    setPreference((current) => ({ ...current, loads: { ...current.loads, [item.id]: next } }));
  }

  return (
    <div className="equip-loads">
      <p><strong>{config.mode === "max" ? "¿Hasta cuánto armas?" : "¿Qué pesos tienes?"}</strong> {config.hint}{config.mode === "each" ? " · marca todos" : ""}</p>
      <div className="equip-load-chips" role="group" aria-label={`Pesos de ${item.label}`}>
        {config.options.map((kg) => (
          <button key={kg} type="button" className="chip num" aria-pressed={values.includes(kg)} onClick={() => choose(kg)}>{label(kg)}</button>
        ))}
      </div>
    </div>
  );
}

/** Acciones al pie: sin equipo o gimnasio completo, y listo con el conteo. */
function EquipmentActions({ place, onClose }: { place: TrainingLocation; onClose: () => void }) {
  const { selected, set } = useEquipment(place);
  return (
    <div className="equip-sheet-actions">
      {place === "home"
        ? <Button variant="ghost" block onClick={() => set([])}>Sólo peso corporal</Button>
        : <Button variant="ghost" block onClick={() => set(fullGym)}>Gimnasio completo</Button>}
      <Button block onClick={onClose}>Listo · {selected.filter((id) => equipmentById.has(id)).length} marcados</Button>
    </div>
  );
}

const leads: Record<TrainingLocation, string> = {
  home: "Marca todo lo que tienes. Elegimos ejercicios que puedas hacer con eso; sin nada, entrenas con tu peso corporal.",
  gym: "Desmarca lo que tu gimnasio no tiene para que tu rutina sólo use lo disponible.",
};

/** Catálogo completo del lugar (desde «Más equipamiento»). */
function EquipmentSheet({ place, open, onClose }: { place: TrainingLocation; open: boolean; onClose: () => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <Sheet open={open} onClose={onClose} eyebrow={place === "home" ? "En casa" : "En tu gimnasio"} title="Tu equipamiento">
      <div className="equip-sheet">
        <p className="muted equip-sheet-lead">{leads[place]}</p>
        <EquipmentList place={place} />
        <EquipmentActions place={place} onClose={onClose} />
      </div>
    </Sheet>,
    document.body,
  );
}

/** Dónde entrenas y con qué, en una sola hoja: lugar arriba y el equipamiento de ese lugar. */
export function PlaceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [preference, setPreference] = usePreference();
  const place = preference.location;
  if (typeof document === "undefined") return null;
  return createPortal(
    <Sheet open={open} onClose={onClose} eyebrow="Tu entreno" title="Dónde entrenas">
      <div className="equip-sheet">
        <SegmentedControl<TrainingLocation> size="l" label="Lugar de entrenamiento" options={placeOptions} value={place} onChange={(location) => setPreference((current) => ({ ...current, location }))} />
        <p className="muted equip-sheet-lead">{leads[place]}</p>
        <div key={place} className="equip-sheet-body train-swap">
          <EquipmentList place={place} />
        </div>
        <EquipmentActions place={place} onClose={onClose} />
      </div>
    </Sheet>,
    document.body,
  );
}
