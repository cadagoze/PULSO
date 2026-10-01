"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Pencil } from "lucide-react";
import { Sheet } from "@/components/ui";
import type { AssessmentProfile } from "@/components/onboarding/wellness-assessment";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  return parts.slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("es-CL") ?? "").join("");
}

function memberSince(profile: AssessmentProfile | null) {
  if (!profile?.createdAt) return "—";
  const date = new Date(profile.createdAt);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CL", { month: "short", year: "numeric" }).replace(".", "");
}

export function ProfileHeader({ name, profile, totalWorkouts, bestStreak, ready, onRename }: { name: string; profile: AssessmentProfile | null; totalWorkouts: number; bestStreak: number; ready: boolean; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const displayName = name.trim() || "Tu perfil";

  function openEditor() {
    setDraft(name);
    setEditing(true);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onRename(draft.trim().slice(0, 40));
    setEditing(false);
  }

  return (
    <section className="card card-forest card-l prof-hero" aria-label="Tu perfil">
      <div className="prof-hero-top">
        <span className="prof-avatar" aria-hidden="true">{initialsOf(name)}</span>
        <div className="prof-hero-id">
          <p className="eyebrow">Tu plan</p>
          <h2>{displayName}</h2>
          <p className="prof-hero-focus">{profile?.recommendation.focus ?? "Completa tu evaluación para personalizar PULSO"}</p>
        </div>
        <button type="button" className="prof-hero-edit" onClick={openEditor} aria-label="Editar nombre">
          <Pencil size={16} />
        </button>
      </div>
      <dl className="prof-hero-stats">
        <div>
          <dt>Entrenamientos</dt>
          <dd className="num">{ready ? totalWorkouts : "—"}</dd>
        </div>
        <div>
          <dt>Mejor racha</dt>
          <dd className="num">
            {ready ? bestStreak : "—"}
            <small> sem</small>
          </dd>
        </div>
        <div>
          <dt>Miembro desde</dt>
          <dd className="prof-hero-since">{ready ? memberSince(profile) : "—"}</dd>
        </div>
      </dl>

      <Sheet open={editing} onClose={() => setEditing(false)} title="¿Cómo te llamamos?" eyebrow="Perfil">
        <form className="stack" onSubmit={save}>
          <label className="field">
            Nombre
            <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={40} autoComplete="given-name" placeholder="Tu nombre" />
          </label>
          <p className="subtle prof-sheet-note">Sólo se usa para saludarte. Queda guardado en este dispositivo.</p>
          <button type="submit" className="btn btn-primary btn-block">Guardar</button>
        </form>
      </Sheet>
    </section>
  );
}
