"use client";

import { accentFor, audienceFor, identityFrom } from "@/lib/personalize";
import { useNutritionProfile, useProfile, useSettings } from "@/lib/store";

/** Cómo te identificas, qué fotos ver y qué color usar (automático o elegido en Ajustes). */
export function usePersonalization() {
  const [settings] = useSettings();
  const [assessment] = useProfile();
  const [nutrition] = useNutritionProfile();
  const identity = identityFrom(assessment?.sex, nutrition?.sex);
  return { identity, audience: audienceFor(settings.photos, identity), accent: accentFor(settings.accent, identity) };
}
