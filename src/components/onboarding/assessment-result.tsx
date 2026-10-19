"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AnimationEvent, CSSProperties } from "react";
import { ArrowLeft, ArrowRight, HeartPulse, RotateCcw, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button, NumberMetric } from "@/components/ui";
import { simpleEquipment, equipmentLabel } from "@/data/equipment";
import type { AssessmentProfile } from "@/lib/assessment";
import { cn } from "@/lib/utils";

const rise = (index: number) => ({ "--i": index }) as CSSProperties;

/**
 * Tu plan como estado especial: foto de esfuerzo apenas desenfocada, con grano, días y minutos en grande,
 * el objetivo y dónde entrenas, y tu nombre (opcional) para saludarte. Al activarlo da paso al Inicio.
 */
export function AssessmentResult({ profile, name, onName, backdrop, retake, disclaimer, onActivate, onBack, onRestart, onCancel }: {
  profile: AssessmentProfile;
  name: string;
  onName: (name: string) => void;
  /** Foto de fondo: el lugar donde vas a entrenar (data/onboarding-photos). */
  backdrop: string;
  /** Se repite desde Perfil: el botón guarda en vez de «empezar». */
  retake: boolean;
  disclaimer: string;
  onActivate: () => void;
  onBack: () => void;
  onRestart: () => void;
  onCancel?: () => void;
}) {
  const { recommendation } = profile;
  const [leaving, setLeaving] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const equipment = (profile.equipment ?? []).map((id) => simpleEquipment.find((item) => item.id === id)?.label ?? equipmentLabel(id));
  const homeLine = equipment.length ? `${equipment.slice(0, 3).join(", ")}${equipment.length > 3 ? ` y ${equipment.length - 3} más` : ""}` : "peso corporal";
  const place = profile.location === "gym" ? (equipment.length ? `Gimnasio · en casa, ${homeLine}` : "Gimnasio") : `Casa · ${homeLine}`;

  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, []);

  function onAnimationEnd(event: AnimationEvent<HTMLElement>) {
    if (leaving && event.target === event.currentTarget && event.animationName === "fade-out") onActivate();
  }

  return (
    <section className={cn("onb-result photo grain on-dark", leaving && "is-leaving")} aria-labelledby="onb-result-title" onAnimationEnd={onAnimationEnd}>
      <div className="onb-result-backdrop" aria-hidden="true">
        <Image src={backdrop} alt="" fill sizes="100vw" />
      </div>
      <div className="onb-result-scroll">
        <header className="onb-top">
          <Logo />
          {onCancel && (
            <button type="button" className="btn-icon small glass" onClick={onCancel} aria-label="Cerrar evaluación">
              <X size={18} />
            </button>
          )}
        </header>

        <div className="onb-result-body">
          <div className="onb-result-main">
            <div className="onb-result-head rise" style={rise(0)}>
              <p className="meta">Tu plan</p>
              <h1 id="onb-result-title" ref={titleRef} tabIndex={-1} className="onb-result-title">{recommendation.focus}</h1>
              <p className="onb-result-message">{recommendation.dailyMessage}</p>
            </div>
            <div className="onb-result-metrics rise" style={rise(2)}>
              <NumberMetric size="xl" value={recommendation.sessionsPerWeek} label="días por semana" />
              <NumberMetric size="xl" value={recommendation.sessionMinutes} label="min por sesión" />
            </div>
          </div>

          <div className="onb-result-side">
            <dl className="onb-result-rows rise" style={rise(4)}>
              <div>
                <dt className="meta">Objetivo</dt>
                <dd>{recommendation.goalLabel}</dd>
              </div>
              <div>
                <dt className="meta">Dónde</dt>
                <dd>{place}</dd>
              </div>
            </dl>

            {recommendation.caution && (
              <aside className="notice warn onb-result-caution rise" style={rise(6)}>
                <HeartPulse size={18} aria-hidden="true" />
                <p>{recommendation.caution}</p>
              </aside>
            )}

            <label className="onb-result-name rise" style={rise(6)}>
              <span className="meta">¿Cómo te llamamos? · opcional</span>
              <input value={name} onChange={(event) => onName(event.target.value)} placeholder="Tu nombre" autoComplete="given-name" enterKeyHint="done" maxLength={40} />
            </label>

            <div className="onb-result-actions rise" style={rise(7)}>
              <Button size="l" block onClick={() => setLeaving(true)}>
                {retake ? "Guardar mi plan" : "Empezar"}
                <ArrowRight size={18} />
              </Button>
              <div className="onb-result-links">
                <Button variant="ghost" size="s" onClick={onBack}>
                  <ArrowLeft size={16} />
                  Volver
                </Button>
                <Button variant="ghost" size="s" onClick={onRestart}>
                  <RotateCcw size={15} />
                  Responder de nuevo
                </Button>
              </div>
            </div>

            <p className="onb-disclaimer">{disclaimer}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
