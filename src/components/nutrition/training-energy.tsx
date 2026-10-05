import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, NumberMetric } from "@/components/ui";
import { activityRank, totalCalories, trainedActivity, weekTraining } from "@/lib/energy";
import { activityLevels, formatKcal } from "@/lib/nutrition";
import type { ActivityLevel, NutritionProfile, WorkoutEntry } from "@/types";

/**
 * Gasto de tus entrenamientos de la semana. Ya está dentro del nivel de actividad del cálculo, así que
 * es informativo; sólo propone subir ese nivel cuando entrenas más de lo que supone.
 */
export function TrainingEnergy({ profile, workouts, weightKg, now, onUseActivity }: {
  profile: NutritionProfile;
  workouts: WorkoutEntry[];
  weightKg: number;
  now: number;
  onUseActivity: (activity: ActivityLevel) => void;
}) {
  const week = weekTraining(workouts, new Date(now));
  const kcal = totalCalories(week.sessions, weightKg);
  const sessions = week.sessions.length;
  const current = activityLevels.find((level) => level.value === profile.activity);
  const trained = trainedActivity(workouts, new Date(now));
  const suggested = trained && activityRank(trained) > activityRank(profile.activity) ? activityLevels.find((level) => level.value === trained) : undefined;

  return (
    <section className="cnt-section" aria-labelledby="nut-energy-title">
      <div className="cnt-head">
        <h2 id="nut-energy-title" className="meta">Entrenamiento</h2>
        <Link href="/entrenar#objetivo" className="cnt-hint nut-energy-link">Qué entrenar<ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
      <div className="nut-energy">
        {sessions > 0 ? (
          <NumberMetric size="m" value={`≈ ${formatKcal(kcal)}`} unit="kcal" label={`en ${sessions} ${sessions === 1 ? "sesión" : "sesiones"} esta semana`} />
        ) : (
          <p className="nut-energy-empty">Aún no entrenas esta semana.</p>
        )}
        <p className="nut-note muted">
          Tu objetivo ya considera tu actividad «{current?.label ?? "Moderada"}», así que no necesitas sumar estas calorías: sirven para ver cuánto aporta moverte.
        </p>
        {suggested && (
          <div className="nut-energy-hint">
            <p className="nut-note">En las últimas 4 semanas entrenaste como una actividad <b>«{suggested.label}»</b>. Si tu día a día también es así, actualízala.</p>
            <Button size="s" variant="secondary" onClick={() => onUseActivity(suggested.value)}>Usar «{suggested.label}»</Button>
          </div>
        )}
      </div>
    </section>
  );
}
