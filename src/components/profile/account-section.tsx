"use client";

import type { CSSProperties } from "react";
import { CloudAccount } from "@/components/cloud/cloud-account";

/** Cuenta y sincronización en Ajustes: opcional (PULSO funciona sin cuenta), para respaldar y usar tus datos en otros equipos. */
export function AccountSection({ onToast, order }: { onToast: (message: string) => void; order?: number }) {
  return (
    <section id="cuenta" className="prof-group rise" style={{ "--i": order } as CSSProperties} aria-labelledby="cuenta-title">
      <header className="prof-group-head">
        <h2 id="cuenta-title" className="meta"><span className="prof-group-index num" aria-hidden="true">04</span>Cuenta y sincronización</h2>
        <p>Opcional: PULSO funciona sin cuenta. Con ella respaldas tus datos y los usas en otros equipos.</p>
      </header>
      <CloudAccount onToast={onToast} heading={false} />
    </section>
  );
}
