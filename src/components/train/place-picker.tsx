"use client";

import { Check } from "lucide-react";
import { equipmentOptions } from "@/data/mock-data";
import { SegmentedControl, ToggleChip } from "@/components/ui";
import { usePreference } from "@/lib/store";
import { placeOptions } from "@/components/train/shared";
import type { TrainingEquipment, TrainingLocation } from "@/types";

/** Dónde entrenas y con qué: alimenta la sesión de hoy y el filtro del selector de ejercicios. */
export function PlacePicker() {
  const [preference, setPreference] = usePreference();
  const count = preference.equipment.length;

  function setLocation(location: TrainingLocation) {
    setPreference((current) => ({ location, equipment: current.equipment }));
  }

  function toggleEquipment(item: TrainingEquipment) {
    setPreference((current) => ({
      ...current,
      equipment: current.equipment.includes(item) ? current.equipment.filter((value) => value !== item) : [...current.equipment, item],
    }));
  }

  return (
    <section className="train-place" aria-label="Dónde entrenas">
      <SegmentedControl size="l" options={placeOptions} value={preference.location} onChange={setLocation} label="Lugar de entrenamiento" />
      {/* La clave vuelve a montar el bloque para que entre con un fundido al cambiar de lugar. */}
      <div key={preference.location} className="train-equip train-swap">
        {preference.location === "home" ? (
          <>
            <div className="train-equip-head">
              <h2 className="meta">Tu equipamiento</h2>
              <span className="train-equip-count num">{count ? `${count} de ${equipmentOptions.length}` : "Sólo peso corporal"}</span>
            </div>
            <div className="chips train-chips">
              {equipmentOptions.map((option) => (
                <ToggleChip key={option.value} pressed={preference.equipment.includes(option.value)} onChange={() => toggleEquipment(option.value)}>
                  {option.label}
                </ToggleChip>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="train-equip-head">
              <h2 className="meta">Equipamiento disponible</h2>
            </div>
            <p className="train-gym-note">
              <span className="train-gym-check" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
              Cuentas con todo: máquinas, poleas, barras, mancuernas, kettlebells, bandas y banco.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
