"use client";

import Link from "@/components/ui/app-link";
import { Activity, ChevronRight, X } from "lucide-react";
import { addDays, testStatus } from "@/lib/fitness-test";
import { useFitnessTests } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { usePersistentState } from "@/lib/use-persistent-state";
import { localDateKey } from "@/lib/utils";

/** Hasta qué día se oculta el aviso en Inicio (sólo en este equipo). */
const SNOOZE_KEY = "pulso:fitness-test-snooze";

/** En Inicio: el primer test físico o, cada 4 semanas, repetirlo. Se puede ocultar por una semana. */
export function FitnessTestRow() {
  const now = useNow();
  const [tests] = useFitnessTests();
  const [snooze, setSnooze] = usePersistentState<string | null>(SNOOZE_KEY, null);
  if (!now) return null;
  const today = localDateKey(new Date(now));
  const status = testStatus(tests, today);
  if (!status.due || (snooze && snooze > today)) return null;
  const first = !status.last;

  return (
    <div className="home-test">
      <Link href="/entrenar/test" className="home-challenge">
        <span className="icon-tile accent" aria-hidden="true"><Activity size={18} /></span>
        <span className="grow">
          <strong>{first ? "Haz tu test físico" : "Toca tu test físico"}</strong>
          <small>{first ? "Tu punto de partida en 12 minutos" : "Pasaron 4 semanas: mira cuánto mejoraste"}</small>
        </span>
        <ChevronRight size={18} className="subtle" aria-hidden="true" />
      </Link>
      <button type="button" className="home-test-close" onClick={() => setSnooze(addDays(today, 7))} aria-label="Ocultar el test físico por una semana"><X size={15} /></button>
    </div>
  );
}
