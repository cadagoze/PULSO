import type { CSSProperties } from "react";
import { HeartPulse, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const appVersion = "2.0";

/** Colofón: marca, privacidad, aviso de bienestar y versión. */
export function AboutSection({ order = 0 }: { order?: number }) {
  return (
    <section id="acerca" className="prof-group prof-about rise" style={{ "--i": order } as CSSProperties} aria-labelledby="acerca-title">
      <header className="prof-group-head">
        <h2 id="acerca-title" className="meta"><span className="prof-group-index num" aria-hidden="true">06</span>Acerca de</h2>
      </header>
      <div className="prof-about-body">
        <Logo className="prof-about-mark" />
        <div className="prof-about-lead">
          <p className="prof-about-tagline">Tu salud en movimiento.</p>
          <p className="prof-about-idea">Entrenamiento que se adapta a tu vida.</p>
        </div>
        <p className="prof-about-line">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Tus datos viven en este dispositivo. La cuenta es opcional y sólo sirve para respaldarlos y sincronizarlos. Sin anuncios.</span>
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
