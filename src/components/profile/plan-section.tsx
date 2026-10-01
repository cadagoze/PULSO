"use client";

import { useState } from "react";
import { ClipboardCheck, RotateCcw } from "lucide-react";
import { Stepper } from "@/components/ui";
import { WellnessAssessment } from "@/components/onboarding/wellness-assessment";
import type { AssessmentProfile } from "@/components/onboarding/wellness-assessment";
import { bodyAreaLabels } from "@/data/catalog";
import type { BodyArea } from "@/types";
import { SettingRow, SettingsGroup } from "./settings-group";

function careAreas(profile: AssessmentProfile) {
  const areas = profile.limitations
    .filter((item): item is BodyArea => item !== "none")
    .map((item) => bodyAreaLabels[item]);
  const custom = profile.customAnswers.limitations.trim();
  if (custom) areas.push(custom);
  return areas;
}

export function PlanSection({ profile, weeklyGoal, onGoalChange, onProfileChange }: { profile: AssessmentProfile | null; weeklyGoal: number; onGoalChange: (value: number) => void; onProfileChange: (profile: AssessmentProfile) => void }) {
  const [assessing, setAssessing] = useState(false);
  const areas = profile ? careAreas(profile) : [];

  return (
    <SettingsGroup index="02" title="Mi plan" description="Lo que PULSO usa para proponerte cada sesión." id="prof-plan">
      <SettingRow
        title="Objetivo semanal"
        helper={`${weeklyGoal} ${weeklyGoal === 1 ? "sesión" : "sesiones"} por semana para sumar a tu racha.`}
        control={<Stepper value={weeklyGoal} onChange={onGoalChange} min={1} max={7} label="sesiones por semana" />}
      />
      {profile ? (
        <div className="prof-row prof-plan-summary">
          <p className="eyebrow">Tu evaluación</p>
          <dl className="prof-plan-grid">
            <div className="prof-plan-wide">
              <dt>Prioridades</dt>
              <dd>{profile.recommendation.goalLabel}</dd>
            </div>
            <div>
              <dt>Por sesión</dt>
              <dd><span className="num">{profile.recommendation.sessionMinutes}</span> min</dd>
            </div>
            <div>
              <dt>Sugerido</dt>
              <dd><span className="num">{profile.recommendation.sessionsPerWeek}</span> días/sem</dd>
            </div>
            <div className="prof-plan-wide">
              <dt>Zonas a cuidar</dt>
              <dd>{areas.length ? areas.join(" · ") : "Ninguna en particular"}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="prof-row">
          <div className="prof-row-text">
            <strong>Aún no tienes evaluación</strong>
            <small>Cinco preguntas breves para ajustar tiempos, ejercicios y zonas a cuidar.</small>
          </div>
        </div>
      )}
      <button type="button" className="prof-row prof-row-action" onClick={() => setAssessing(true)}>
        <span className="icon-tile">{profile ? <RotateCcw size={19} /> : <ClipboardCheck size={19} />}</span>
        <span className="prof-row-text">
          <strong>{profile ? "Repetir evaluación" : "Hacer evaluación"}</strong>
          <small>Toma unos dos minutos. Tus entrenamientos se conservan.</small>
        </span>
      </button>
      {assessing && (
        <WellnessAssessment
          onComplete={(next) => {
            onProfileChange(next);
            setAssessing(false);
          }}
          onCancel={() => setAssessing(false)}
        />
      )}
    </SettingsGroup>
  );
}
