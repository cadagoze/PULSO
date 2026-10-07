import type { IllustrationSpec } from "@/lib/illustration";
import { armsBackIllustrations } from "./arms-back";
import { coreCardioIllustrations } from "./core-cardio";
import { equipmentIllustrations } from "./equipment";
import { lowerAIllustrations } from "./lower-a";
import { lowerBIllustrations } from "./lower-b";
import { mobilityIllustrations } from "./mobility";
import { pullIllustrations } from "./pull";
import { pushIllustrations } from "./push";

/** Ilustraciones por id de ejercicio (los que no tienen foto). */
export const exerciseIllustrations: Partial<Record<number, IllustrationSpec>> = {
  ...lowerAIllustrations,
  ...lowerBIllustrations,
  ...pushIllustrations,
  ...pullIllustrations,
  ...coreCardioIllustrations,
  ...mobilityIllustrations,
  ...equipmentIllustrations,
  ...armsBackIllustrations,
};
