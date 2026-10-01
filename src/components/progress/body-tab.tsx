"use client";

import { MeasurementsSection } from "@/components/progress/measurements-section";
import { WeightSection } from "@/components/progress/weight-section";

export function BodyTab() {
  return (
    <div className="prog-stack">
      <WeightSection />
      <MeasurementsSection />
    </div>
  );
}
