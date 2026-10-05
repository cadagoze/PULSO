"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button, NumberMetric, SegmentedControl } from "@/components/ui";
import { activityLevels, defaultAdjustment, formatKcal, goalShortLabels, nutritionTargets, paceOptions } from "@/lib/nutrition";
import { cn, fromDisplayWeight, toDisplayWeight } from "@/lib/utils";
import type { ActivityLevel, NutritionGoal, NutritionProfile, NutritionSpecialCase, Sex } from "@/types";
import { LimitNote } from "./limit-note";

const specialOptions: Array<{ value: NutritionSpecialCase; label: string }> = [
  { value: "none", label: "Ninguna" },
  { value: "pregnancy", label: "Embarazo o lactancia" },
  { value: "eating-disorder", label: "He tenido un trastorno de la conducta alimentaria" },
];

const parse = (value: string) => Number(value.trim().replace(",", "."));

/**
 * Datos para calcular calorías y macros, con el resultado en vivo. El peso se guarda en el registro
 * de peso (fuente única para Progreso y Nutrición).
 */
export function NutritionSetup({ initial, weightKg, unit, onSave }: { initial: NutritionProfile; weightKg: number | null; unit: "kg" | "lb"; onSave: (profile: NutritionProfile, weightKg: number) => void }) {
  const now = new Date();
  const [sex, setSex] = useState<Sex>(initial.sex);
  const [age, setAge] = useState(String(now.getFullYear() - initial.birthYear));
  const [height, setHeight] = useState(String(initial.heightCm));
  const [weight, setWeight] = useState(weightKg ? String(toDisplayWeight(weightKg, unit)).replace(".", ",") : "");
  const [activity, setActivity] = useState<ActivityLevel>(initial.activity);
  const [goal, setGoal] = useState<NutritionGoal>(initial.goal);
  const [adjustment, setAdjustment] = useState(initial.adjustment);
  const [special, setSpecial] = useState<NutritionSpecialCase>(initial.special);

  const ageValue = parse(age);
  const heightValue = parse(height);
  const weightValue = fromDisplayWeight(parse(weight), unit);
  const errors = {
    age: !Number.isFinite(ageValue) || ageValue < 14 || ageValue > 100 ? "Entre 14 y 100 años." : "",
    height: !Number.isFinite(heightValue) || heightValue < 120 || heightValue > 230 ? "Entre 120 y 230 cm." : "",
    weight: !weight.trim() || !Number.isFinite(weightValue) || weightValue < 30 || weightValue > 300 ? "Ingresa un peso válido." : "",
  };
  const valid = !errors.age && !errors.height && !errors.weight;

  const draft: NutritionProfile = {
    ...initial,
    sex,
    birthYear: now.getFullYear() - Math.round(ageValue || 0),
    heightCm: Math.round(heightValue || 0),
    activity,
    goal,
    adjustment: goal === "maintain" ? 0 : adjustment,
    special,
    // Con antecedente de TCA, PULSO no propone contar calorías.
    mode: special === "eating-disorder" ? "simple" : initial.mode,
    customKcal: undefined,
    updatedAt: now.toISOString(),
  };
  const targets = valid ? nutritionTargets(draft, weightValue, now) : null;

  function changeGoal(next: NutritionGoal) {
    setGoal(next);
    setAdjustment(defaultAdjustment(next));
  }

  return (
    <div className="nut-setup">
      <div className="nut-field">
        <span className="nut-label">Sexo <small>(lo usa la fórmula del metabolismo)</small></span>
        <SegmentedControl label="Sexo" options={[{ value: "female", label: "Mujer" }, { value: "male", label: "Hombre" }]} value={sex} onChange={setSex} />
      </div>

      <div className="nut-trio">
        <label className="field">
          Edad
          <input inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} aria-invalid={Boolean(errors.age)} />
          {errors.age && <small className="form-error">{errors.age}</small>}
        </label>
        <label className="field">
          Estatura (cm)
          <input inputMode="numeric" value={height} onChange={(event) => setHeight(event.target.value)} aria-invalid={Boolean(errors.height)} />
          {errors.height && <small className="form-error">{errors.height}</small>}
        </label>
        <label className="field">
          Peso ({unit})
          <input inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} aria-invalid={Boolean(errors.weight)} placeholder="72,5" />
          {errors.weight && <small className="form-error">{errors.weight}</small>}
        </label>
      </div>

      <fieldset className="nut-field">
        <legend className="nut-label">Actividad diaria <small>(incluye tus entrenamientos)</small></legend>
        <div className="nut-options">
          {activityLevels.map((level) => (
            <button key={level.value} type="button" className={cn("nut-option pressable", activity === level.value && "is-selected")} aria-pressed={activity === level.value} onClick={() => setActivity(level.value)}>
              <span className="grow"><strong>{level.label}</strong><small>{level.detail}</small></span>
              <span className="nut-option-check" aria-hidden="true">{activity === level.value && <Check size={14} strokeWidth={3} />}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="nut-field">
        <span className="nut-label">Objetivo</span>
        <SegmentedControl label="Objetivo" options={(["lose", "maintain", "gain"] as const).map((value) => ({ value, label: goalShortLabels[value] }))} value={goal} onChange={changeGoal} />
      </div>

      {goal !== "maintain" && (
        <div className="nut-field">
          <span className="nut-label">Ritmo</span>
          <SegmentedControl label="Ritmo" options={paceOptions[goal].map((option) => ({ value: String(option.value), label: option.label }))} value={String(adjustment)} onChange={(value) => setAdjustment(Number(value))} />
          <small className="nut-hint">{Math.abs(adjustment)} % {adjustment < 0 ? "menos" : "más"} que tu gasto diario{paceOptions[goal].some((option) => option.recommended && option.value === adjustment) ? " · el ritmo recomendado" : ""}</small>
        </div>
      )}

      <fieldset className="nut-field">
        <legend className="nut-label">¿Alguna de estas situaciones aplica?</legend>
        <div className="nut-options">
          {specialOptions.map((option) => (
            <button key={option.value} type="button" className={cn("nut-option nut-option-s pressable", special === option.value && "is-selected")} aria-pressed={special === option.value} onClick={() => setSpecial(option.value)}>
              <span className="grow"><strong>{option.label}</strong></span>
              <span className="nut-option-check" aria-hidden="true">{special === option.value && <Check size={14} strokeWidth={3} />}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="nut-preview" aria-live="polite">
        {targets ? (
          <>
            <p className="meta">Tu objetivo diario</p>
            <NumberMetric size="l" value={formatKcal(targets.kcal)} unit="kcal" label={targets.weeklyChangeKg !== 0 ? `≈ ${Math.abs(targets.weeklyChangeKg).toLocaleString("es-CL")} kg ${targets.weeklyChangeKg < 0 ? "menos" : "más"} por semana` : "Para mantener tu peso"} />
            <div className="nut-preview-macros">
              <NumberMetric size="s" value={targets.protein} unit="g" label="Proteína" />
              <NumberMetric size="s" value={targets.carbs} unit="g" label="Carbohidratos" />
              <NumberMetric size="s" value={targets.fat} unit="g" label="Grasa" />
            </div>
            <LimitNote targets={targets} special={special} />
          </>
        ) : (
          <p className="muted">Completa edad, estatura y peso para ver tu objetivo.</p>
        )}
      </div>

      <Button size="l" block disabled={!valid} onClick={() => { if (valid) onSave(draft, Math.round(weightValue * 10) / 10); }}>
        <Check size={18} />
        Guardar mi plan
      </Button>
      <p className="subtle nut-disclaimer">Es una estimación general a partir de fórmulas validadas. No reemplaza la evaluación de un nutricionista o profesional de salud.</p>
    </div>
  );
}
