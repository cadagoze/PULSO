"use client";

import { useState } from "react";
import { ChevronDown, Dumbbell } from "lucide-react";
import { usePreference } from "@/lib/store";
import { PlaceSheet, equipmentCount, useEquipment } from "@/components/train/equipment-picker";

/**
 * Lugar y equipamiento en un chip compacto («Casa · 2 equipos»): al tocarlo se abre la hoja para
 * cambiarlos, sin ocupar la pantalla del entreno.
 */
export function PlaceChip() {
  const [preference] = usePreference();
  const place = preference.location;
  const { selected } = useEquipment(place);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="place-chip pressable" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Dumbbell size={15} aria-hidden="true" />
        <span className="place-chip-text">
          <strong>{place === "home" ? "Casa" : "Gimnasio"}</strong>
          <small>{equipmentCount(place, selected)}</small>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <PlaceSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
