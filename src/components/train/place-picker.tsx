"use client";

import { SegmentedControl } from "@/components/ui";
import { usePreference } from "@/lib/store";
import { placeOptions } from "@/components/train/shared";
import { EquipmentChips, equipmentCount, useEquipment } from "@/components/train/equipment-picker";
import type { TrainingLocation } from "@/types";

/** Dónde entrenas y con qué: alimenta la sesión de hoy y el filtro del selector de ejercicios. */
export function PlacePicker() {
  const [preference, setPreference] = usePreference();
  const place = preference.location;
  const { selected } = useEquipment(place);

  function setLocation(location: TrainingLocation) {
    setPreference((current) => ({ ...current, location }));
  }

  return (
    <section className="train-place" aria-label="Dónde entrenas">
      <SegmentedControl size="l" options={placeOptions} value={place} onChange={setLocation} label="Lugar de entrenamiento" />
      {/* La clave vuelve a montar el bloque para que entre con un fundido al cambiar de lugar. */}
      <div key={place} className="train-equip train-swap">
        <div className="train-equip-head">
          <h2 className="meta">{place === "home" ? "Tu equipamiento" : "Equipamiento del gimnasio"}</h2>
          <span className="train-equip-count num">{equipmentCount(place, selected)}</span>
        </div>
        <EquipmentChips place={place} />
      </div>
    </section>
  );
}
