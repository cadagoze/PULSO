import type { ReactNode } from "react";
import { clockLabel } from "@/lib/training";
import { cn } from "@/lib/utils";

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Reloj grande de entrenamiento. Con `total` dibuja un anillo que se vacía de forma continua
 * (cuenta regresiva de descanso) y marca los últimos segundos; sin `total` es un cronómetro.
 */
export function WorkoutTimer({ seconds, total, label, size = 232, ending, className, children }: { seconds: number; total?: number; label?: string; size?: number; ending?: boolean; className?: string; children?: ReactNode }) {
  const remaining = Math.max(0, seconds);
  const fraction = total ? Math.max(0, Math.min(1, remaining / total)) : 1;
  const isEnding = ending ?? Boolean(total && remaining > 0 && remaining <= 3);
  return (
    <div className={cn("workout-timer", isEnding && "is-ending", className)} style={{ width: size, height: size }} role="timer" aria-label={label ? `${label}: ${clockLabel(remaining)}` : clockLabel(remaining)}>
      {total !== undefined && (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="workout-timer-track" cx="50" cy="50" r={RADIUS} />
          <circle className="workout-timer-value" cx="50" cy="50" r={RADIUS} strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - fraction)} />
        </svg>
      )}
      <div className="workout-timer-center">
        {label && <span className="meta">{label}</span>}
        <span className="timer-digits" style={{ fontSize: size * 0.27 }}>{clockLabel(remaining)}</span>
        {children}
      </div>
    </div>
  );
}
