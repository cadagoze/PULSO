"use client";

import Link from "@/components/ui/app-link";
import { Armchair, ChevronRight } from "lucide-react";
import { breaksOn, routineMinutes, suggestedRoutine } from "@/lib/active-breaks";
import { usePushSettings } from "@/lib/push";
import { useBreaks } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { localDateKey } from "@/lib/utils";

/** En Inicio, en horario de oficina (lunes a viernes, 9 a 19 h): la pausa que toca. Sólo si ya usas las pausas. */
export function BreakRow() {
  const now = useNow(60_000);
  const [entries] = useBreaks();
  const [push] = usePushSettings();
  if (!now) return null;
  const date = new Date(now);
  const workday = date.getDay() >= 1 && date.getDay() <= 5 && date.getHours() >= 9 && date.getHours() < 19;
  if (!workday || (!push.prefs.breaks && !entries.length)) return null;
  const today = localDateKey(date);
  const count = breaksOn(entries, today);
  const routine = suggestedRoutine(entries, today);

  return (
    <Link href={`/pausas/${routine.id}`} className="home-challenge home-break">
      <span className="icon-tile accent" aria-hidden="true"><Armchair size={18} /></span>
      <span className="grow">
        <strong>Pausa activa · {routine.name}</strong>
        <small>{routineMinutes(routine)} min · {count ? `llevas ${count} ${count === 1 ? "pausa" : "pausas"} hoy` : "aún sin pausas hoy"}</small>
      </span>
      <ChevronRight size={18} className="subtle" aria-hidden="true" />
    </Link>
  );
}
