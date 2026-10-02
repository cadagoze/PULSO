"use client";

import { MeasurementsSection } from "@/components/progress/measurements-section";
import { WeightSection } from "@/components/progress/weight-section";

/** Cuerpo: registro y tendencia del peso, y medidas con la cinta. */
export function BodyTab() {
  return (
    <div className="prog-body">
      <WeightSection />
      <MeasurementsSection />
    </div>
  );
}
