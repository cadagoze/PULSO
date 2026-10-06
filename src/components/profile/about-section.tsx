import type { CSSProperties } from "react";
import { HeartPulse, ShieldCheck } from "lucide-react";

export const appVersion = "2.0";

/** Colofón: marca, privacidad, aviso de bienestar y versión. */
export function AboutSection({ order = 0 }: { order?: number }) {
  return (
    <section id="acerca" className="prof-group prof-about rise" style={{ "--i": order } as CSSProperties} aria-labelledby="acerca-title">
      <header className="prof-group-head">
        <h2 id="acerca-title" className="meta"><span className="prof-group-index num" aria-hidden="true">06</span>Acerca de</h2>
      </header>
      <div className="prof-about-body">
        <p className="wordmark prof-about-mark">PULSO<span>.</span></p>
        <div className="prof-about-lead">
          <p className="prof-about-tagline">Tu salud en movimiento.</p>
          <p className="prof-about-idea">Entrenamiento que se adapta a tu vida.</p>
        </div>
        <p className="prof-about-line">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Tus datos viven sólo en este dispositivo. Sin cuentas, sin servidores, sin anuncios.</span>
        </p>
        <p className="prof-about-line">
          <HeartPulse size={16} aria-hidden="true" />
          <span>PULSO entrega orientación general de bienestar y entrenamiento. No reemplaza la evaluación de un profesional de salud. Si sientes dolor, mareos o malestar, detente y consulta.</span>
        </p>
        <p className="meta prof-about-version">Versión <span className="num">{appVersion}</span></p>
      </div>
    </section>
  );
}
