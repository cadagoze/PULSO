"use client";

import { useState } from "react";
import { ChevronRight, Dumbbell } from "lucide-react";
import { SegmentedControl } from "@/components/ui";
import { placeOptions } from "@/components/train/shared";
import { PlaceSheet, equipmentCount, useEquipment } from "@/components/train/equipment-picker";
import { equipmentById } from "@/data/equipment";
import { usePreference } from "@/lib/store";
import type { TrainingEquipment, TrainingLocation } from "@/types";

/** «Mancuernas · Banco y 2 más», «Sólo peso corporal» o, en el gimnasio, «Gimnasio completo». */
function equipmentSummary(place: TrainingLocation, selected: TrainingEquipment[]) {
  if (place === "gym" || !selected.length) return equipmentCount(place, selected);
  const labels = selected.map((id) => equipmentById.get(id)?.label).filter((label): label is string => Boolean(label));
  const shown = labels.slice(0, 2).join(" · ");
  return labels.length > 2 ? `${shown} y ${labels.length - 2} más` : shown;
}

/**
 * Entrenar empieza por el lugar: Casa | Gimnasio a la vista (cambia la rutina al instante) y, debajo,
 * el equipamiento de ese lugar, que se ajusta en una hoja.
 */
export function PlaceBar() {
  const [preference, setPreference] = usePreference();
  const place = preference.location;
  const { selected } = useEquipment(place);
  const [open, setOpen] = useState(false);
  return (
    <section className="place-bar" aria-label="Dónde entrenas">
      <SegmentedControl<TrainingLocation> size="l" label="Lugar de entrenamiento" options={placeOptions} value={place} onChange={(location) => setPreference((current) => ({ ...current, location }))} />
      <button type="button" className="place-bar-equip pressable" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Dumbbell size={16} aria-hidden="true" />
        <span className="grow">{equipmentSummary(place, selected)}</span>
        <span className="place-bar-edit">Equipamiento<ChevronRight size={15} aria-hidden="true" /></span>
      </button>
      <PlaceSheet open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
