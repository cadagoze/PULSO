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

/** Fila bajo la rutina de hoy: «¿Una zona?» con las zonas en una línea deslizable. */
export function ZoneRow({ value, onChange }: { value: BodyZone | null; onChange: (zone: BodyZone | null) => void }) {
  return (
    <section className="train-zones" aria-labelledby="train-zones-title">
      <h2 id="train-zones-title" className="meta">{value ? "Rutina por zona · toca de nuevo para quitarla" : "¿Quieres trabajar una zona?"}</h2>
      <ZoneChips value={value} onChange={onChange} className="scroll-x train-zones-row" />
    </section>
  );
}
