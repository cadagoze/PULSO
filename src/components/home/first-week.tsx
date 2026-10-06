"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check } from "lucide-react";
import { Button, ButtonLink, Sheet } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/toast";
import { InstallSheet } from "@/components/install/install-sheet";
import { isLogged } from "@/components/content/meal-log";
import { firstWeekSteps, type FirstWeekStep } from "@/lib/first-week";
import { promptInstall, useInstallState } from "@/lib/install";
import { useActivatePush, usePushSettings, usePushSupport } from "@/lib/push";
import { useFoodLog, useMeals, useNutritionProfile, useWorkouts } from "@/lib/store";
import { usePersistentState } from "@/lib/use-persistent-state";
import { cn } from "@/lib/utils";

const FIRST_WEEK_KEY = "pulso:first-week";
const initialState = { dismissed: false };

/** Si la guía sigue visible (mientras tanto, el paso de instalar reemplaza la tarjeta de instalación). */
export function useFirstWeekState() {
  return usePersistentState<{ dismissed: boolean }>(FIRST_WEEK_KEY, initialState);
}

/**
 * Primera semana guiada en Inicio: el progreso y el próximo paso con su botón; la lista completa en
 * una hoja. Los pasos se marcan solos y la guía se cierra al completarla (o cuando la ocultas).
 */
export function FirstWeek() {
  const [nutrition] = useNutritionProfile();
  const [foodLog] = useFoodLog();
  const [meals] = useMeals();
  const [workouts] = useWorkouts();
  const install = useInstallState();
  const [push] = usePushSettings();
  const support = usePushSupport();
  const activate = useActivatePush();
  const [state, setState] = useFirstWeekState();
  const [open, setOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();

  if (!install.ready || state.dismissed) return null;

  const steps = firstWeekSteps({
    hasPlan: Boolean(nutrition),
    hasWorkout: workouts.length > 0,
    hasMeal: foodLog.length > 0 || meals.some(isLogged),
    platform: install.platform,
    standalone: install.standalone,
    push: support,
    pushEnabled: push.enabled,
  });
  const done = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);

  function dismiss() {
    setOpen(false);
    setState({ dismissed: true });
  }

  async function installNow() {
    if (install.platform !== "ios" && install.canPrompt) {
      if (await promptInstall()) show("PULSO quedó instalada en tu inicio");
      return;
    }
    setInstallOpen(true);
  }

  async function enablePush() {
    setBusy(true);
    const result = await activate();
    setBusy(false);
    show(result.ok ? "Avisos activados" : result.reason === "denied" ? "Sin permiso para avisos" : "No se pudieron activar. Intenta de nuevo");
  }

  function action(step: FirstWeekStep, size: "s" | "m" = "s") {
    const variant = size === "s" ? "secondary" : "primary";
    switch (step.id) {
      case "plan": return <ButtonLink href="/comidas?calcular=1" size={size} variant={variant}>Calcular</ButtonLink>;
      case "workout": return <ButtonLink href="/entrenar" size={size} variant={variant}>Entrenar</ButtonLink>;
      case "meal": return <ButtonLink href="/comidas?registrar=1" size={size} variant={variant}>Registrar</ButtonLink>;
      case "install": return <Button size={size} variant={variant} onClick={() => void installNow()}>{install.platform !== "ios" && install.canPrompt ? "Instalar" : "Ver cómo"}</Button>;
      case "push":
        if (support === "needs-install") return <Button size={size} variant={variant} onClick={() => setInstallOpen(true)}>Ver cómo</Button>;
        if (support === "denied") return <ButtonLink href="/ajustes#avisos" size={size} variant={variant}>Ajustes</ButtonLink>;
        return <Button size={size} variant={variant} disabled={busy} onClick={() => void enablePush()}>Activar</Button>;
    }
  }

  return (
    <section className="first-week" aria-labelledby="first-week-title">
      <div className="first-week-head">
        <p id="first-week-title" className="meta">Tu primera semana · <span className="num">{done}</span> de <span className="num">{steps.length}</span></p>
        <button type="button" className="link-button first-week-all" onClick={() => setOpen(true)}>Ver pasos<ArrowRight size={14} aria-hidden="true" /></button>
      </div>
      <div className="first-week-bar" aria-hidden="true">
        {steps.map((step) => <span key={step.id} className={cn(step.done && "is-done")} />)}
      </div>
      {next ? (
        <div className="first-week-next">
          <span className="grow">
            <strong>{next.title}</strong>
            <small>{next.detail}</small>
          </span>
          {action(next, "m")}
        </div>
      ) : (
        <div className="first-week-next is-complete">
          <span className="first-week-check" aria-hidden="true"><Check size={18} strokeWidth={3} /></span>
          <span className="grow">
            <strong>Primera semana lista</strong>
            <small>Ya tienes todo a mano. Ahora, constancia.</small>
          </span>
          <Button size="s" variant="secondary" onClick={dismiss}>Cerrar</Button>
        </div>
      )}

      {typeof document !== "undefined" && createPortal(
        <>
          <Sheet open={open} onClose={() => setOpen(false)} eyebrow={`${done} de ${steps.length} listos`} title="Tu primera semana">
            <div className="first-week-sheet">
              <ol className="first-week-steps">
                {steps.map((step) => (
                  <li key={step.id} className={cn("first-week-step", step.done && "is-done")}>
                    <span className="first-week-dot" aria-hidden="true">{step.done && <Check size={14} strokeWidth={3} />}</span>
                    <span className="grow">
                      <strong>{step.title}<span className="sr-only">{step.done ? ", listo" : ", pendiente"}</span></strong>
                      <small>{step.done ? "Listo." : step.detail}</small>
                    </span>
                    {!step.done && action(step)}
                  </li>
                ))}
              </ol>
              <p className="muted first-week-note">Todo esto también está en Perfil y Ajustes.</p>
              <Button variant="ghost" block onClick={dismiss}>Ocultar guía</Button>
            </div>
          </Sheet>
          <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} platform={install.platform} canPrompt={install.canPrompt} onDone={show} />
        </>,
        document.body,
      )}
      <Toast toast={toast} />
    </section>
  );
}
