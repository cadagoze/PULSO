"use client";

import { useState, type ReactNode } from "react";
import { CloudCheck, CloudUpload, EllipsisVertical, LogIn, Share, SquarePlus } from "lucide-react";
import { Button, Sheet } from "@/components/ui";
import { SignInSheet } from "@/components/cloud/sign-in-sheet";
import { promptInstall, type InstallPlatform } from "@/lib/install";
import { useCloudStatus } from "@/lib/cloud/use-cloud";

function Step({ index, icon, title, children }: { index: number; icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <li className="install-step">
      <span className="install-step-icon" aria-hidden="true">{icon}</span>
      <span className="grow">
        <strong><span className="num">{index}.</span> {title}</strong>
        {children && <small>{children}</small>}
      </span>
    </li>
  );
}

/**
 * Cómo instalar PULSO según el equipo. En iPhone la app instalada empieza sin datos (no comparte
 * los de Safari), así que el primer paso es guardarlos en la nube para recuperarlos al entrar.
 */
export function InstallSheet({ open, onClose, platform, canPrompt, onDone }: { open: boolean; onClose: () => void; platform: InstallPlatform; canPrompt: boolean; onDone?: (message: string) => void }) {
  const cloud = useCloudStatus();
  const [signIn, setSignIn] = useState(false);
  const signedIn = Boolean(cloud.user);

  async function install() {
    const accepted = await promptInstall();
    onClose();
    if (accepted) onDone?.("PULSO quedó instalada en tu inicio");
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} eyebrow="Instalar" title="PULSO en tu pantalla de inicio" className="install-sheet">
        <div className="install-body">
          <p className="install-lead">Se abre con un toque, a pantalla completa y sin la barra del navegador, como cualquier app.</p>

          {platform === "ios" && (
            <>
              <div className={signedIn ? "install-cloud is-done" : "install-cloud"}>
                <span className="install-step-icon" aria-hidden="true">{signedIn ? <CloudCheck size={18} /> : <CloudUpload size={18} />}</span>
                <span className="grow">
                  <strong>{signedIn ? "Tus datos ya están en la nube" : "Primero, guarda tus datos en la nube"}</strong>
                  <small>{signedIn ? "Al abrir la app instalada, entra con la misma cuenta y aparecerán." : "En iPhone la app instalada empieza vacía: con tu cuenta recuperas todo al entrar."}</small>
                  {!signedIn && <Button size="s" onClick={() => setSignIn(true)}><CloudUpload size={16} />Guardar en la nube</Button>}
                </span>
              </div>
              <ol className="install-steps">
                <Step index={1} icon={<Share size={18} />} title="Toca Compartir en Safari">El cuadrado con una flecha hacia arriba. Si no lo ves, toca ⋯ primero.</Step>
                <Step index={2} icon={<SquarePlus size={18} />} title="Elige «Agregar a inicio»">Desliza hacia abajo en la lista si no aparece de inmediato.</Step>
                <Step index={3} icon={<LogIn size={18} />} title="Abre PULSO desde su ícono">En la bienvenida toca «¿Ya usas PULSO? Inicia sesión» para traer tus datos.</Step>
              </ol>
              <p className="subtle install-note">¿Lo abriste desde WhatsApp u otra app? Ábrelo primero en Safari.</p>
            </>
          )}

          {platform !== "ios" && canPrompt && (
            <Button size="l" block onClick={() => void install()}><SquarePlus size={18} />Instalar PULSO</Button>
          )}

          {platform === "android" && !canPrompt && (
            <ol className="install-steps">
              <Step index={1} icon={<EllipsisVertical size={18} />} title="Abre el menú ⋮ de Chrome">Arriba a la derecha.</Step>
              <Step index={2} icon={<SquarePlus size={18} />} title="Toca «Instalar app»">O «Agregar a la pantalla principal», según tu teléfono.</Step>
            </ol>
          )}

          {platform === "desktop" && !canPrompt && (
            <p className="install-lead">En Chrome o Edge, usa el ícono de instalar al final de la barra de direcciones. En el teléfono es donde más se aprovecha.</p>
          )}
        </div>
      </Sheet>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={onDone} />
    </>
  );
}
