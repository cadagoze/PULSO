"use client";

import { bodyZones, type BodyZone } from "@/data/body-zones";
import { cn } from "@/lib/utils";

/** Zonas del cuerpo como chips: tocar una arma la rutina para esa zona; tocarla de nuevo la quita. */
export function ZoneChips({ value, onChange, className }: { value: BodyZone | null; onChange: (zone: BodyZone | null) => void; className?: string }) {
  return (
    <div className={cn("chips", className)} role="group" aria-label="Zona del cuerpo">
      {bodyZones.map((zone) => (
        <button key={zone.id} type="button" className="chip" aria-pressed={value === zone.id} onClick={() => onChange(value === zone.id ? null : zone.id)}>
          {zone.label}
        </button>
      ))}
    </div>
  );
}
