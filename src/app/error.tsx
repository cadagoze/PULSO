"use client";

import { useEffect } from "react";
import { Isotype } from "@/components/brand/logo";
import { Button, ButtonLink } from "@/components/ui";

/** Error inesperado en una pantalla: no se pierde nada (los datos viven en el dispositivo) y se puede reintentar. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page state-page">
      <Isotype className="state-mark" />
      <p className="meta">Algo falló</p>
      <h1 className="title-xl">No pudimos mostrar esta pantalla</h1>
      <p className="state-text">Tus entrenamientos y registros están a salvo en este dispositivo. Reintenta; si se repite, vuelve a Inicio.</p>
      <div className="state-actions">
        <Button size="l" onClick={reset}>Reintentar</Button>
        <ButtonLink href="/" variant="ghost" size="l">Volver a Inicio</ButtonLink>
      </div>
    </div>
  );
}
