"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AnimationEvent, CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Check, HeartPulse, RotateCcw, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button, NumberMetric } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { AssessmentProfile } from "./wellness-assessment";

const rise = (index: number) => ({ "--i": index }) as CSSProperties;
/** La misma foto de la portada, desenfocada y con grano: atmósfera cálida, sin paneles verdes. */
const backdrop = "/images/editorial/home-squat.webp";

/**
 * Tu plan inicial como estado especial: foto desenfocada con grano, sesiones y minutos en grande,
 * el foco y el primer hábito. Al activarlo se desvanece y da paso al Inicio.
 */
export function AssessmentResult({ profile, retake, disclaimer, onActivate, onBack, onRestart, onCancel }: {
  profile: AssessmentProfile;
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
  const place = profile.location === "gym"
    ? "En el gimnasio"
    : profile.equipment?.length
      ? `En casa · ${profile.equipment.length} ${profile.equipment.length === 1 ? "implemento" : "implementos"}`
      : "En casa · peso corporal";

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
              <p className="meta">Tu plan inicial{profile.name ? ` · ${profile.name}` : ""}</p>
              <h1 id="onb-result-title" ref={titleRef} tabIndex={-1} className="onb-result-title">{recommendation.focus}</h1>
              <p className="onb-result-message">{recommendation.dailyMessage}</p>
            </div>
            <div className="onb-result-metrics rise" style={rise(2)}>
              <NumberMetric size="xl" value={recommendation.sessionsPerWeek} label="sesiones por semana" />
              <NumberMetric size="xl" value={recommendation.sessionMinutes} label="min por sesión" />
            </div>
          </div>

          <div className="onb-result-side">
            <div className="onb-result-habit rise" style={rise(4)}>
              <span className="onb-result-habit-icon" aria-hidden="true"><Check size={18} strokeWidth={2.6} /></span>
              <div>
                <p className="meta">Tu primer hábito</p>
                <strong>{recommendation.firstHabit}</strong>
              </div>
            </div>

            <dl className="onb-result-rows rise" style={rise(5)}>
              <div>
                <dt className="meta">Prioridades</dt>
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
