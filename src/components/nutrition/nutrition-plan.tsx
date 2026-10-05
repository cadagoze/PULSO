import { SlidersHorizontal, UserRoundPen } from "lucide-react";
import { Button, NumberMetric, SegmentedControl } from "@/components/ui";
import { activityLevels, formatKcal, GLASS_ML, goalLabels, paceOptions, type NutritionTargets } from "@/lib/nutrition";
import type { NutritionProfile } from "@/types";
import { LimitNote } from "./limit-note";

/** Tu plan: objetivo, calorías y macros, de dónde salen y cómo cambiarlos. */
export function NutritionPlan({ profile, targets, onEdit, onAdjust, onModeChange }: {
  profile: NutritionProfile;
  targets: NutritionTargets;
  onEdit: () => void;
  onAdjust: () => void;
  onModeChange: (mode: NutritionProfile["mode"]) => void;
}) {
  const activity = activityLevels.find((level) => level.value === profile.activity);
  const pace = paceOptions[profile.goal].find((option) => option.value === profile.adjustment);
  const adjustment = targets.limited && targets.limited !== "floor" ? 0 : profile.adjustment;
  const countAllowed = profile.special !== "eating-disorder";

  return (
    <section className="nut-plan" aria-labelledby="nut-plan-title">
      <div className="nut-plan-head">
        <p className="meta">Tu plan de alimentación</p>
        <h2 id="nut-plan-title" className="title-m">{goalLabels[profile.goal]}{profile.goal !== "maintain" && pace ? ` · ${pace.label.toLowerCase()}` : ""}</h2>
      </div>
      <div className="nut-plan-grid">
        <NumberMetric size="m" value={formatKcal(targets.kcal)} unit="kcal" label={targets.custom ? "Fijadas por ti" : "Calorías al día"} />
        <NumberMetric size="m" value={targets.protein} unit="g" label="Proteína" />
        <NumberMetric size="s" value={targets.carbs} unit="g" label="Carbohidratos" />
        <NumberMetric size="s" value={targets.fat} unit="g" label="Grasa" />
        <NumberMetric size="s" value={targets.fiber} unit="g" label="Fibra" />
        <NumberMetric size="s" value={targets.waterLiters.toLocaleString("es-CL")} unit="L" label={`Agua · ${Math.round((targets.waterLiters * 1000) / GLASS_ML)} vasos`} />
      </div>
      <p className="nut-plan-why">
        Gastas cerca de <b className="num">{formatKcal(targets.tdee)}</b> kcal al día (metabolismo basal <span className="num">{formatKcal(targets.bmr)}</span> × actividad {activity?.label.toLowerCase()}).
        {adjustment !== 0 && !targets.custom && <> Tu objetivo ajusta <span className="num">{adjustment > 0 ? "+" : ""}{adjustment} %</span>{targets.weeklyChangeKg !== 0 && <>: unos <span className="num">{Math.abs(targets.weeklyChangeKg).toLocaleString("es-CL")} kg</span> {targets.weeklyChangeKg < 0 ? "menos" : "más"} por semana</>}.</>}
        {" "}La proteína ayuda a conservar y ganar músculo con tus entrenamientos.
      </p>
      <LimitNote targets={targets} special={profile.special} />
      {countAllowed && (
        <div className="nut-field">
          <span className="nut-label">Cómo registras</span>
          <SegmentedControl label="Modo de registro" options={[{ value: "count", label: "Contar calorías" }, { value: "simple", label: "Sin contar" }]} value={profile.mode} onChange={onModeChange} />
        </div>
      )}
      <div className="nut-plan-actions">
        <Button variant="secondary" onClick={onEdit}><UserRoundPen size={16} />Editar mis datos</Button>
        <Button variant="ghost" onClick={onAdjust}><SlidersHorizontal size={16} />Ajustar calorías</Button>
      </div>
      <p className="subtle nut-disclaimer">Estimación general basada en Mifflin-St Jeor. Si tienes una condición de salud, define tu plan con un profesional.</p>
    </section>
  );
}
