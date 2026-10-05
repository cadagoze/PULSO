"use client";

import { useMemo, useState } from "react";
import { WellnessAssessment } from "@/components/onboarding/wellness-assessment";
import { bestWeekStreak, weekStreak } from "@/lib/analytics";
import { useProfile, useSettings, useWeights, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { CloudAccount } from "@/components/cloud/cloud-account";
import { PlanSection } from "./plan-section";
import { profilePhoto } from "./photo";
import { ProfileEditor } from "./profile-editor";
import { latestWeight, weightNumber } from "./profile-format";
import { ProfileHeader } from "./profile-header";
import { ProfileLinks } from "./profile-links";
import { Toast, useToast } from "@/components/ui/toast";

/** Perfil: portada editorial (foto, nombre, objetivo y números), el plan actual y accesos a ajustes. */
export function ProfileView() {
  const [profile, setProfile] = useProfile();
  const [workouts] = useWorkouts();
  const [weights] = useWeights();
  const [settings, update] = useSettings();
  const now = useNow();
  const { toast, show } = useToast();
  const [editing, setEditing] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [assessing, setAssessing] = useState(false);

  const bestStreak = useMemo(() => {
    if (!now) return 0;
    const current = weekStreak(workouts, settings.weeklyGoal, settings.pausedWeeks, new Date(now));
    return Math.max(current.streak, bestWeekStreak(workouts, settings.weeklyGoal, settings.pausedWeeks));
  }, [now, settings.pausedWeeks, settings.weeklyGoal, workouts]);

  // Hasta hidratar no conocemos los datos guardados: evitamos mostrar un perfil vacío por error.
  if (!now) return <ProfileSkeleton />;

  const photo = profilePhoto(settings.photo);
  const latest = latestWeight(weights);

  function openEditor() {
    setEditorKey((key) => key + 1);
    setEditing(true);
  }

  function saveProfile(draft: { name: string; photo?: string }) {
    const saved = update({ name: draft.name, photo: draft.photo });
    if (saved) show(draft.photo !== photo ? (draft.photo ? "Foto actualizada" : "Foto quitada") : "Perfil actualizado");
    return saved;
  }

  return (
    <div className="page prof-page">
      <ProfileHeader
        name={settings.name}
        photo={photo}
        profile={profile}
        workouts={workouts.length}
        bestStreak={bestStreak}
        weight={latest ? weightNumber(latest.weight, settings.unit) : null}
        unit={settings.unit}
        onEdit={openEditor}
      />
      <div className="prof-side">
        <CloudAccount onToast={show} />
        <PlanSection onAssess={() => setAssessing(true)} onToast={show} />
        <ProfileLinks hasProfile={Boolean(profile)} onAssess={() => setAssessing(true)} />
      </div>

      <ProfileEditor key={editorKey} open={editing} onClose={() => setEditing(false)} name={settings.name} photo={photo} onSave={saveProfile} />
      {assessing && (
        <WellnessAssessment
          onComplete={(next) => {
            setProfile(next);
            setAssessing(false);
            show("Plan actualizado");
          }}
          onCancel={() => setAssessing(false)}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="page prof-page" aria-busy="true">
      <div className="prof-skeleton prof-skeleton-hero" />
      <div className="prof-side">
        <div className="prof-skeleton prof-skeleton-card" />
      </div>
    </div>
  );
}
