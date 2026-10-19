"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AnimationEvent, CSSProperties } from "react";
import { ArrowRight, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { SignInSheet } from "@/components/cloud/sign-in-sheet";
import { useCloudStatus } from "@/lib/cloud/use-cloud";
import { RestoreSheet } from "./restore-sheet";
import { cn } from "@/lib/utils";

// Pesas sobre el piso de un gimnasio en penumbra (rawpixel, CC0). El muro y la luz de la ventana son CSS.
const floor = { src: "/images/editorial/splash-floor.webp", alt: "" };

/**
 * Portada de bienvenida: gimnasio en penumbra con luz entrando por la ventana, la frase de marca en
 * mayúsculas angostas, el botón para empezar y «Ya tengo PULSO» para recuperar los datos (cuenta o
 * respaldo) sin repetir la evaluación. Al empezar se desvanece sobre la primera pregunta, que ya está debajo.
 */
export function AssessmentSplash({ steps, leaving, onStart, onLeft }: { steps: number; leaving: boolean; onStart: () => void; onLeft: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [signIn, setSignIn] = useState(false);
  const [restore, setRestore] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const cloud = useCloudStatus();
  // Con la cuenta abierta, los datos bajan de la nube; si traen la evaluación, Inicio reemplaza esta portada.
  const restoring = cloud.phase === "starting" || cloud.phase === "syncing";
  const emptyAccount = Boolean(cloud.user) && cloud.phase === "synced";
  const status = restoring
    ? "Recuperando tus datos…"
    : emptyAccount
      ? "Tu cuenta aún no tiene una evaluación guardada. Respóndela para armar tu plan."
      : notice;

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
          <Logo gradient className="onb-splash-logo" />
        </header>
        <div className="onb-splash-center">
          <p className="onb-splash-kicker rise" style={{ "--i": 2 } as CSSProperties}>Disciplina</p>
          <span className="onb-splash-rule rise" style={{ "--i": 2 } as CSSProperties} aria-hidden="true" />
          <h1 id="onb-splash-title" ref={titleRef} tabIndex={-1} className="onb-splash-title rise" style={{ "--i": 3 } as CSSProperties}>
            <span>Entrenamiento</span> <span>que se adapta</span> <span className="onb-splash-accent">a tu vida</span>
          </h1>
          <span className="onb-splash-rule rise" style={{ "--i": 4 } as CSSProperties} aria-hidden="true" />
          <p className="onb-splash-kicker rise" style={{ "--i": 4 } as CSSProperties}>Entrena · Come bien · Avanza</p>
        </div>
        <div className="onb-splash-cta rise" style={{ "--i": 6 } as CSSProperties}>
          <p className="onb-splash-lead">{steps} preguntas · 2 minutos · tu primer plan, para casa o gimnasio.</p>
          {status && <p className={cn("onb-splash-status", restoring && "is-busy")} role="status">{status}</p>}
          <Button size="l" block onClick={onStart} disabled={restoring}>
            Empezar
            <ArrowRight size={18} />
          </Button>
          <button type="button" className="btn btn-large btn-block onb-splash-restore" onClick={() => setRestore(true)} disabled={restoring}>
            <RotateCcw size={17} aria-hidden="true" />Ya tengo PULSO · recuperar mis datos
          </button>
          <p className="onb-splash-note">
            <Lock size={13} aria-hidden="true" />
            <span>Sin cuenta obligatoria: tus datos quedan en este teléfono.</span>
          </p>
        </div>
      </div>
      <RestoreSheet
        open={restore}
        onClose={() => setRestore(false)}
        onSignIn={() => { setNotice(null); setSignIn(true); }}
        onImported={(hasPlan) => setNotice(hasPlan ? "Datos recuperados." : "Recuperamos tus datos, pero el respaldo no trae tu evaluación. Respóndela para armar tu plan.")}
      />
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </section>
  );
}
