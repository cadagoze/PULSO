"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AnimationEvent, CSSProperties } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { SignInSheet } from "@/components/cloud/sign-in-sheet";
import { cn } from "@/lib/utils";

const photo = { src: "/images/editorial/home-squat.webp", alt: "Persona haciendo una sentadilla en su sala, con luz natural" };

/**
 * Portada de bienvenida: fotografía a sangre con grano, la idea de marca en grande y el botón para empezar
 * (o entrar con una cuenta existente para traer tus datos).
 * Al empezar se desvanece sobre la primera pregunta, que ya está debajo.
 */
export function AssessmentSplash({ steps, leaving, onStart, onLeft }: { steps: number; leaving: boolean; onStart: () => void; onLeft: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [signIn, setSignIn] = useState(false);

  // El foco entra en la portada (también al volver desde la primera pregunta).
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, []);

  function onAnimationEnd(event: AnimationEvent<HTMLElement>) {
    if (leaving && event.target === event.currentTarget) onLeft();
  }

  return (
    <section className={cn("onb-splash photo grain on-dark", leaving && "is-leaving")} aria-labelledby="onb-splash-title" inert={leaving} onAnimationEnd={onAnimationEnd}>
      <Image src={photo.src} alt={photo.alt} fill sizes="100vw" preload loading="eager" className="photo-img onb-splash-photo" />
      <div className="onb-splash-content photo-content">
        <header className="onb-splash-top">
          <span className="wordmark">PULSO<span>.</span></span>
          <span className="meta">Tu salud en movimiento.</span>
        </header>
        <div className="onb-splash-body">
          <p className="meta rise" style={{ "--i": 2 } as CSSProperties}>Evaluación inicial · 2 min</p>
          <h1 id="onb-splash-title" ref={titleRef} tabIndex={-1} className="onb-splash-title rise" style={{ "--i": 3 } as CSSProperties}>Entrenamiento que se adapta a tu vida.</h1>
          <p className="onb-splash-lead rise" style={{ "--i": 5 } as CSSProperties}>Responde {steps} preguntas y armamos tu primer plan, para casa o gimnasio.</p>
          <div className="onb-splash-cta rise" style={{ "--i": 7 } as CSSProperties}>
            <Button size="l" block onClick={onStart}>
              Empezar
              <ArrowRight size={18} />
            </Button>
            <p className="onb-splash-note">
              <Lock size={13} aria-hidden="true" />
              <span>Sin cuenta obligatoria. ¿Ya usas PULSO? <button type="button" className="onb-splash-signin" onClick={() => setSignIn(true)}>Inicia sesión</button></span>
            </p>
          </div>
        </div>
      </div>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </section>
  );
}
