"use client";

import Link from "@/components/ui/app-link";
import type { CSSProperties } from "react";
import { Camera, Pencil, Settings as SettingsIcon, UserRound } from "lucide-react";
import { Button, NumberMetric } from "@/components/ui";
import type { AssessmentProfile } from "@/components/onboarding/wellness-assessment";
import { cn } from "@/lib/utils";
import type { Settings } from "@/types";
import { goalsSentence, initialsOf, memberSince, splitFocus } from "./profile-format";

/** Foto de perfil o, sin foto, las iniciales (o un ícono si aún no hay nombre). */
export function Avatar({ name, photo }: { name: string; photo?: string }) {
  // La clave cambia con cada foto nueva, así entra con un fundido.
  if (photo) return <span key={photo.slice(-32)} className="prof-avatar-photo" style={{ backgroundImage: `url("${photo}")` }} />;
  const initials = initialsOf(name);
  return initials ? <span className="prof-avatar-initials">{initials}</span> : <UserRound size={34} strokeWidth={1.6} />;
}

type HeaderProps = {
  name: string;
  photo?: string;
  profile: AssessmentProfile | null;
  workouts: number;
  bestStreak: number;
  /** Peso actual ya formateado («81,5»), o null si no hay registros. */
  weight: string | null;
  unit: Settings["unit"];
  onEdit: () => void;
};

/**
 * Portada editorial del perfil: foto, nombre en grande, objetivo y tres números.
 * El fondo es atmósfera con grano; con foto, tu propia foto desenfocada.
 */
export function ProfileHeader({ name, photo, profile, workouts, bestStreak, weight, unit, onEdit }: HeaderProps) {
  const displayName = name.trim();
  const since = memberSince(profile);
  const focus = profile ? splitFocus(profile.recommendation.focus).head : "";
  const goals = profile ? goalsSentence(profile.recommendation.goalLabel) : "";

  return (
    <section className={cn("prof-hero atmosphere grain on-dark rise", photo && "has-photo")} style={{ "--i": 0 } as CSSProperties} aria-labelledby="prof-name">
      {photo && <span className="prof-hero-blur" style={{ backgroundImage: `url("${photo}")` }} aria-hidden="true" />}
      <div className="prof-hero-top">
        <p className="meta">Perfil{since ? ` · desde ${since}` : ""}</p>
        <Link href="/ajustes" className="icon-button glass" aria-label="Ajustes"><SettingsIcon size={19} /></Link>
      </div>

      <div className="prof-hero-id">
        <div className="prof-hero-row">
          <button type="button" className="prof-avatar" onClick={onEdit} aria-label={photo ? "Cambiar foto" : "Añadir foto"}>
            <Avatar name={name} photo={photo} />
            <span className="prof-avatar-badge" aria-hidden="true">{photo ? <Pencil size={13} /> : <Camera size={14} />}</span>
          </button>
          <Button variant="glass" size="s" onClick={onEdit}>Editar perfil</Button>
        </div>
        <h1 id="prof-name" className="prof-name">{displayName || "Tu perfil"}</h1>
        <p className="prof-goal">
          {profile ? (
            <>{focus && <b>{focus}</b>}{focus && goals ? " · " : ""}{goals}</>
          ) : (
            "Completa tu evaluación para personalizar PULSO."
          )}
        </p>
      </div>

      <div className="prof-stats">
        <NumberMetric value={workouts} label={workouts === 1 ? "entrenamiento" : "entrenamientos"} />
        <NumberMetric value={bestStreak} unit="sem" label="mejor racha" />
        {weight ? (
          <NumberMetric value={weight} unit={unit} label="peso actual" />
        ) : (
          <NumberMetric value={<span className="nmetric-soft">—</span>} label={<Link href="/progreso?tab=cuerpo" className="prof-stat-link">Registra tu peso</Link>} />
        )}
      </div>
    </section>
  );
}
