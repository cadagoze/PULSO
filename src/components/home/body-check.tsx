"use client";

import { useId, useState } from "react";
import { trainingLoad } from "@/lib/analytics";
import { feelOptions, painOptions, painSafety, quickReadiness, readinessAdvice, readinessFeel, type Feel, type PainArea } from "@/lib/readiness";
import { useReadiness, useWellness, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { usePersonalization } from "@/lib/use-personalize";
import { cn } from "@/lib/utils";

/**
 * «Cómo estás hoy»: un toque (Bien, Cansado, Muy cansado) ajusta la sesión de hoy. Si hay molestia,
 * se marca la zona y la sesión evita ejercicios que la exijan. Se puede cambiar cuando quieras. Es el
 * único chequeo de PULSO: en Inicio va dentro de «Tu cuerpo» (`embedded`, como pregunta) y en
 * Bienestar, como sección.
 */
export function BodyCheck({ today, title = "Cómo estás hoy", embedded = false }: { today: string; title?: string; embedded?: boolean }) {
  const titleId = useId();
  const painId = useId();
  const [entries, setEntries] = useReadiness();
  const [workouts] = useWorkouts();
  const [wellness] = useWellness();
  const { audience } = usePersonalization();
  const now = useNow();
  const saved = entries.find((entry) => entry.date === today);
  const feel = saved ? readinessFeel(saved) : null;
  const pain = saved?.pain ?? [];
  const [askPain, setAskPain] = useState(false);
  const showPain = askPain || pain.length > 0;

  function save(nextFeel: Feel, nextPain: PainArea[]) {
    const sleepHours = wellness.find((entry) => entry.date === today)?.sleepHours ?? null;
    const entry = quickReadiness({ date: today, feel: nextFeel, pain: nextPain, sleepHours, loadRatio: trainingLoad(workouts, now).ratio });
    setEntries((items) => [entry, ...items.filter((item) => item.date !== today)]);
  }

  function togglePain(area: PainArea) {
    if (feel) save(feel, pain.includes(area) ? pain.filter((item) => item !== area) : [...pain, area]);
  }

  function noPain() {
    setAskPain(false);
    if (feel && pain.length) save(feel, []);
  }

  const Wrapper = embedded ? "div" : "section";
  return (
    <Wrapper className={embedded ? "body-check-embedded" : "home-body"} aria-labelledby={titleId}>
      {embedded ? <p id={titleId} className="body-question">{title}</p> : <h2 id={titleId} className="meta">{title}</h2>}
      <div className="body-check">
        <div className="body-feel" role="group" aria-labelledby={titleId}>
          {feelOptions(audience).map((option) => (
            <button key={option.value} type="button" className={cn("body-feel-option", `is-${option.value}`)} aria-pressed={feel === option.value} onClick={() => save(option.value, pain)}>
              {option.label}
            </button>
          ))}
        </div>
        {saved && feel ? (
          <>
            <p className="body-advice" aria-live="polite">{readinessAdvice[saved.recommendation]}</p>
            <div className="body-pain">
              <span id={painId}>¿Alguna molestia?</span>
              <div className="body-pain-toggle" role="group" aria-labelledby={painId}>
                <button type="button" aria-pressed={!showPain} onClick={noPain}>No</button>
                <button type="button" aria-pressed={showPain} onClick={() => setAskPain(true)}>Sí</button>
              </div>
            </div>
            {showPain && (
              <div className="body-pain-areas">
                <div className="chips" role="group" aria-label="Dónde molesta">
                  {painOptions.map((option) => (
                    <button key={option.value} type="button" className="chip" aria-pressed={pain.includes(option.value)} onClick={() => togglePain(option.value)}>{option.label}</button>
                  ))}
                </div>
                <p className="body-safety">{painSafety}</p>
              </div>
            )}
          </>
        ) : (
          <p className="body-hint">Un toque y ajustamos tu sesión de hoy.</p>
        )}
      </div>
    </Wrapper>
  );
}
