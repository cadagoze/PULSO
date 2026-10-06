"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { Button, Sheet, ToggleChip } from "@/components/ui";
import { equipmentById, equipmentCategoryLabels, equipmentFor, fullGym, type EquipmentCategory } from "@/data/equipment";
import { usePreference } from "@/lib/store";
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

/** Catálogo completo del lugar, agrupado: se marca y desmarca al instante. */
function EquipmentSheet({ place, open, onClose }: { place: TrainingLocation; open: boolean; onClose: () => void }) {
  const { selected, set, toggle } = useEquipment(place);
  const items = equipmentFor(place);

  if (typeof document === "undefined") return null;
  return createPortal(
    <Sheet open={open} onClose={onClose} eyebrow={place === "home" ? "En casa" : "En tu gimnasio"} title="Tu equipamiento">
      <div className="equip-sheet">
        <p className="muted equip-sheet-lead">
          {place === "home"
            ? "Marca todo lo que tienes. Elegimos ejercicios que puedas hacer con eso; sin nada, entrenas con tu peso corporal."
            : "Desmarca lo que tu gimnasio no tiene para que tu rutina sólo use lo disponible."}
        </p>
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
                    <button key={item.id} type="button" className="equip-row" aria-pressed={pressed} onClick={() => toggle(item.id)}>
                      <span className="grow">
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </span>
                      <span className="equip-check" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        <div className="equip-sheet-actions">
          {place === "home"
            ? <Button variant="ghost" block onClick={() => set([])}>Sólo peso corporal</Button>
            : <Button variant="ghost" block onClick={() => set(fullGym)}>Gimnasio completo</Button>}
          <Button block onClick={onClose}>Listo · {selected.filter((id) => equipmentById.has(id)).length} marcados</Button>
        </div>
      </div>
    </Sheet>,
    document.body,
  );
}
