"use client";

import { useRouter } from "next/navigation";

/** Vistas secundarias de Progreso. Se conservan los valores de `?tab=` de la versión anterior. */
export const progressViews = [
  { value: "historial", label: "Historial" },
  { value: "records", label: "Récords" },
  { value: "cuerpo", label: "Cuerpo" },
  { value: "logros", label: "Logros" },
  { value: "retos", label: "Retos" },
  { value: "test", label: "Test físico" },
] as const;

export type ProgressSubview = (typeof progressViews)[number]["value"];

export function isSubview(value: string | null): value is ProgressSubview {
  return progressViews.some((view) => view.value === value);
}

export function subviewHref(view: ProgressSubview) {
  return `/progreso?tab=${view}`;
}

/** Si la vista secundaria se abrió desde el resumen, «Volver» retrocede en el historial en lugar de apilar otra entrada. */
let openedFromSummary = false;

export function markFromSummary() {
  openedFromSummary = true;
}

export function clearFromSummary() {
  openedFromSummary = false;
}

export function useBackToSummary() {
  const router = useRouter();
  return () => {
    const back = openedFromSummary;
    openedFromSummary = false;
    if (back) router.back();
    else router.push("/progreso");
  };
}
