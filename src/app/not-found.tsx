"use client";

import { Isotype } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui";

/** Enlace roto o página que ya no existe: la marca, una frase clara y la vuelta a Inicio. */
export default function NotFound() {
  return (
    <div className="page state-page">
      <Isotype className="state-mark" />
      <p className="meta">Error 404</p>
      <h1 className="title-xl">Esta página no existe</h1>
      <p className="state-text">Puede que el enlace esté incompleto o que la página haya cambiado. Tus datos siguen intactos.</p>
      <ButtonLink href="/" size="l">Volver a Inicio</ButtonLink>
    </div>
  );
}
