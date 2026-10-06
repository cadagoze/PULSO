"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AnimationEvent, CSSProperties } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { SignInSheet } from "@/components/cloud/sign-in-sheet";
import { cn } from "@/lib/utils";

// Pesas sobre el piso de un gimnasio en penumbra (rawpixel, CC0). El muro y la luz de la ventana son CSS.
const floor = { src: "/images/editorial/splash-floor.webp", alt: "" };

/**
 * Portada de bienvenida: gimnasio en penumbra con luz entrando por la ventana, la frase de marca en
 * mayúsculas angostas y el botón para empezar (o entrar con una cuenta para traer tus datos).
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
    <section className={cn("onb-splash grain on-dark", leaving && "is-leaving")} aria-labelledby="onb-splash-title" inert={leaving} onAnimationEnd={onAnimationEnd}>
      <div className="onb-splash-scene" aria-hidden="true">
        <span className="onb-splash-window" />
        <span className="onb-splash-beams" />
        <Image src={floor.src} alt={floor.alt} fill sizes="100vw" preload loading="eager" className="onb-splash-floor" />
      </div>
      <div className="onb-splash-content">
        <header className="onb-splash-top">
          <span className="wordmark">PULSO<span>.</span></span>
        </header>
        <div className="onb-splash-center">
          <p className="onb-splash-kicker rise" style={{ "--i": 2 } as CSSProperties}>Disciplina</p>
          <span className="onb-splash-rule rise" style={{ "--i": 2 } as CSSProperties} aria-hidden="true" />
          <h1 id="onb-splash-title" ref={titleRef} tabIndex={-1} className="onb-splash-title rise" style={{ "--i": 3 } as CSSProperties}>
            <span>Tu salud</span> <span className="onb-splash-accent">en movimiento</span>
          </h1>
          <span className="onb-splash-rule rise" style={{ "--i": 4 } as CSSProperties} aria-hidden="true" />
          <p className="onb-splash-kicker rise" style={{ "--i": 4 } as CSSProperties}>Entrena · Come bien · Avanza</p>
        </div>
        <div className="onb-splash-cta rise" style={{ "--i": 6 } as CSSProperties}>
          <p className="onb-splash-lead">{steps} preguntas · 2 minutos · tu primer plan, para casa o gimnasio.</p>
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
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </section>
  );
}
