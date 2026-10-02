"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowRight, ClipboardCheck, HeartPulse, House, Building2, SlidersHorizontal } from "lucide-react";
import { Button, MetaLine, ProgressBar, SegmentedControl, Sheet, Stepper, ToggleChip } from "@/components/ui";
import { equipmentOptions } from "@/data/mock-data";
import { durationOptions } from "@/lib/generator";
import { nextProgramSession, programById, programTotalSessions } from "@/lib/programs";
import { usePreference, useProfile, useProgram, useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { TrainingEquipment, TrainingLocation } from "@/types";
import { careAreas, placeSummary, splitFocus } from "./profile-format";

const locationOptions: Array<{ value: TrainingLocation; label: string }> = [
  { value: "home", label: "Casa" },
  { value: "gym", label: "Gimnasio" },
];
const minuteOptions = durationOptions.map((minutes) => ({ value: String(minutes), label: `${minutes}` }));

/** «Mi plan actual»: el foco en grande, frecuencia, duración, lugar y equipamiento, y el botón para editarlo. */
export function PlanSection({ onAssess, onToast }: { onAssess: () => void; onToast: (message: string) => void }) {
  const [profile] = useProfile();
  const [settings] = useSettings();
  const [preference] = usePreference();
  const [progress] = useProgram();
  const [open, setOpen] = useState(false);
  const changed = useRef(false);

  const days = settings.weeklyGoal;
  const minutes = profile?.recommendation.sessionMinutes;
  const focus = profile ? splitFocus(profile.recommendation.focus) : null;
  const tagline = focus ? focus.rest : "Cinco preguntas breves y PULSO ajusta tiempos, ejercicios y zonas a cuidar.";
  const { place, gear } = placeSummary(preference);
  const areas = profile ? careAreas(profile) : [];
  const program = progress ? programById(progress.programId) : undefined;
  const next = program && progress ? nextProgramSession(program, progress) : null;
  const total = program ? programTotalSessions(program) : 0;
  const done = program && progress ? Math.min(total, progress.completed.length) : 0;

  function close() {
    setOpen(false);
    if (changed.current) onToast("Plan actualizado");
    changed.current = false;
  }

  return (
    <>
      <section className="card card-l prof-plan rise" style={{ "--i": 1 } as CSSProperties} aria-labelledby="prof-plan-title">
        <p className="meta">Mi plan actual</p>
        <div className="prof-plan-heading">
          <h2 id="prof-plan-title" className={cn("prof-plan-title", (focus?.head.length ?? 0) > 7 && "is-long")}>{focus?.head || "Tu plan"}</h2>
          {tagline && <p className="prof-plan-tagline">{tagline}</p>}
        </div>

        <div className="prof-plan-facts">
          <MetaLine
            className="prof-plan-meta"
            items={[
              <><b className="num">{days}</b> {days === 1 ? "día" : "días"} por semana</>,
              minutes !== undefined && <><b className="num">{minutes}</b> min</>,
            ]}
          />
          <p className="prof-plan-line">
            {preference.location === "gym" ? <Building2 size={17} aria-hidden="true" /> : <House size={17} aria-hidden="true" />}
            <span><b>{place}</b> · {gear}</span>
          </p>
          {areas.length > 0 && (
            <p className="prof-plan-line">
              <HeartPulse size={17} aria-hidden="true" />
              <span>Zonas a cuidar: {areas.join(", ")}</span>
            </p>
          )}
        </div>

        {program && progress && (
          <Link href={`/entrenar/programas/${program.id}`} className="prof-plan-program pressable">
            <span className="prof-plan-program-text">
              <span className="meta">{next ? "Programa activo" : "Programa completado"}</span>
              <strong>{program.name}</strong>
              <small className="num">{next ? `Semana ${next.week} de ${program.weeks} · ` : ""}{done} de {total} sesiones</small>
              <ProgressBar value={total ? (done / total) * 100 : 0} label={`${done} de ${total} sesiones del programa`} />
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}

        <div className="prof-plan-actions">
          {profile ? (
            <Button size="l" block onClick={() => setOpen(true)}><SlidersHorizontal size={18} aria-hidden="true" />Editar mi plan</Button>
          ) : (
            <>
              <Button size="l" block onClick={onAssess}><ClipboardCheck size={18} aria-hidden="true" />Hacer evaluación</Button>
              <Button variant="secondary" size="l" block onClick={() => setOpen(true)}>Editar mi plan</Button>
            </>
          )}
        </div>
      </section>

      <Sheet open={open} onClose={close} eyebrow="Mi plan actual" title="Editar mi plan">
        <PlanForm
          onChange={() => { changed.current = true; }}
          onDone={close}
          onAssess={() => { close(); onAssess(); }}
        />
      </Sheet>
    </>
  );
}

/** Controles del plan: se guardan al momento, como el resto de ajustes. */
function PlanForm({ onChange, onDone, onAssess }: { onChange: () => void; onDone: () => void; onAssess: () => void }) {
  const [profile, setProfile] = useProfile();
  const [settings, update] = useSettings();
  const [preference, setPreference] = usePreference();
  const areas = profile ? careAreas(profile) : [];

  function setDays(weeklyGoal: number) {
    update({ weeklyGoal });
    onChange();
  }

  function setMinutes(value: string) {
    const sessionMinutes = Number(value);
    setProfile((current) => (current ? { ...current, recommendation: { ...current.recommendation, sessionMinutes } } : current));
    onChange();
  }

  function setLocation(location: TrainingLocation) {
    setPreference((current) => ({ ...current, location }));
    onChange();
  }

  function toggleEquipment(item: TrainingEquipment) {
    setPreference((current) => ({
      ...current,
      equipment: current.equipment.includes(item) ? current.equipment.filter((value) => value !== item) : [...current.equipment, item],
    }));
    onChange();
  }

  return (
    <div className="prof-form">
      <div className="prof-field prof-field-inline">
        <div className="prof-field-text">
          <span className="prof-field-label">Días por semana</span>
          <small>Tu objetivo semanal. Cada semana que lo cumples suma a tu racha.</small>
        </div>
        <Stepper value={settings.weeklyGoal} onChange={setDays} min={1} max={7} label="días por semana" />
      </div>

      {profile && (
        <div className="prof-field">
          <span className="prof-field-label">Minutos por sesión</span>
          <SegmentedControl label="Minutos por sesión" options={minuteOptions} value={String(profile.recommendation.sessionMinutes)} onChange={setMinutes} />
        </div>
      )}

      <div className="prof-field">
        <span className="prof-field-label">Dónde entrenas</span>
        <SegmentedControl<TrainingLocation> label="Lugar de entrenamiento" options={locationOptions} value={preference.location} onChange={setLocation} />
        {preference.location === "home" ? (
          <div key="home" className="prof-field-reveal">
            <div className="chips" role="group" aria-label="Equipamiento disponible">
              {equipmentOptions.map((option) => (
                <ToggleChip key={option.value} pressed={preference.equipment.includes(option.value)} onChange={() => toggleEquipment(option.value)}>
                  {option.label}
                </ToggleChip>
              ))}
            </div>
            <p className="prof-field-help">Marca lo que tienes en casa. Sin nada, usamos tu peso corporal.</p>
          </div>
        ) : (
          <p key="gym" className="prof-field-reveal prof-field-help">En el gimnasio asumimos máquinas, poleas y pesos libres.</p>
        )}
      </div>

      {profile && (
        <p className="prof-note">
          Tu evaluación sugiere {profile.recommendation.sessionsPerWeek} {profile.recommendation.sessionsPerWeek === 1 ? "día" : "días"} por semana. Zonas a cuidar: {areas.length ? areas.join(", ").toLocaleLowerCase("es-CL") : "ninguna en particular"}.{" "}
          <button type="button" className="link-button" onClick={onAssess}>Rehacer evaluación</button>
        </p>
      )}

      <Button size="l" block onClick={onDone}>Listo</Button>
    </div>
  );
}
