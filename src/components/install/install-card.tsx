"use client";

import { useState } from "react";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/toast";
import { InstallSheet } from "@/components/install/install-sheet";
import { dismissInstall, promptInstall, useInstallState } from "@/lib/install";

/**
 * Invitación en Inicio a instalar PULSO en el teléfono. No aparece si ya está instalada, si la
 * cerraste (vuelve en 30 días) ni en el computador salvo que el navegador ofrezca instalar.
 */
export function InstallCard() {
  const state = useInstallState();
  const { toast, show: onToast } = useToast();
  const [open, setOpen] = useState(false);
  const mobile = state.platform !== "desktop";
  const visible = state.ready && !state.standalone && !state.dismissed && (mobile || state.canPrompt);

  async function primary() {
    if (state.platform !== "ios" && state.canPrompt) {
      if (await promptInstall()) onToast("PULSO quedó instalada en tu inicio");
      return;
    }
    setOpen(true);
  }

  return (
    <>
      {visible && (
        <section className="install-card" aria-labelledby="install-card-title">
          <span className="icon-tile lime" aria-hidden="true"><Smartphone size={19} /></span>
          <div className="grow">
            <strong id="install-card-title">Instala PULSO en tu teléfono</strong>
            <p>Se abre con un toque, a pantalla completa, y tus datos quedan más protegidos.</p>
            <Button size="s" onClick={() => void primary()}>{state.platform !== "ios" && state.canPrompt ? "Instalar" : "Ver cómo"}</Button>
          </div>
          <button type="button" className="btn-icon small install-close" onClick={dismissInstall} aria-label="Ahora no"><X size={16} /></button>
        </section>
      )}
      <InstallSheet open={open} onClose={() => setOpen(false)} platform={state.platform} canPrompt={state.canPrompt} onDone={onToast} />
      <Toast toast={toast} />
    </>
  );
}
