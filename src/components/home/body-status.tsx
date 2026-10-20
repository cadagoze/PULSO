"use client";

import { useMemo } from "react";
import Link from "@/components/ui/app-link";
import { Check, ChevronRight, Clock } from "lucide-react";
import { BodyCheck } from "@/components/home/body-check";
import { recoveryOutlook } from "@/lib/recovery";
import { useWorkouts } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * «Tu cuerpo»: el chequeo de un toque (antes de entrenar; cambia la sesión de hoy) y cómo vienen tus
 * músculos en una línea («Espalda · mañana · Piernas ✓ · Pecho ✓»). Los detalles viven en Bienestar.
 */
export function BodyStatus({ now, today, check }: { now: number; today: string; check: boolean }) {
  const [workouts] = useWorkouts();
  const outlook = useMemo(() => recoveryOutlook(workouts, now), [now, workouts]);
  return (
    <section className="home-body" aria-labelledby="home-body-title">
      <div className="home-section-head">
        <h2 id="home-body-title" className="meta">Tu cuerpo</h2>
        <Link href="/bienestar" className="home-section-link">Detalles<ChevronRight size={15} aria-hidden="true" /></Link>
      </div>
      {check && <BodyCheck today={today} title="¿Cómo está tu cuerpo hoy?" embedded />}
      <ul className="home-recovery" aria-label="Recuperación muscular">
        {outlook.map((item) => (
          <li key={item.label} className={cn(item.ready && "is-ready")}>
            {item.ready ? <Check size={14} strokeWidth={2.6} aria-hidden="true" /> : <Clock size={14} aria-hidden="true" />}
            <span>
              {item.label}
              {item.ready ? <span className="sr-only">, recuperación completa</span> : <> · {item.eta}<span className="sr-only"> con la recuperación completa</span></>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
