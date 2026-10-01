import Link from "next/link";
import { BookOpen, ChevronRight, ShieldCheck, Utensils } from "lucide-react";
import { SettingsGroup } from "./settings-group";

export const appVersion = "2.0";

export function WellbeingSection() {
  return (
    <SettingsGroup index="05" title="Bienestar" id="prof-wellbeing">
      <Link href="/comidas" className="prof-row prof-row-action">
        <span className="icon-tile"><Utensils size={19} /></span>
        <span className="prof-row-text">
          <strong>Comidas y saciedad</strong>
          <small>Registra cómo comes sin contar calorías.</small>
        </span>
        <ChevronRight size={18} className="prof-chevron" />
      </Link>
      <Link href="/guia" className="prof-row prof-row-action">
        <span className="icon-tile violet"><BookOpen size={19} /></span>
        <span className="prof-row-text">
          <strong>Guía y artículos</strong>
          <small>Lecturas breves sobre fuerza, descanso y alimentación.</small>
        </span>
        <ChevronRight size={18} className="prof-chevron" />
      </Link>
    </SettingsGroup>
  );
}

export function AboutSection() {
  return (
    <section className="prof-about" aria-labelledby="prof-about-title">
      <div className="wordmark prof-about-mark">PULSO<span>.</span></div>
      <p className="prof-about-tagline" id="prof-about-title">Tu salud en movimiento.</p>
      <p className="prof-about-privacy">
        <ShieldCheck size={16} />
        Tus datos viven sólo en este dispositivo. Sin cuentas, sin servidores, sin anuncios.
      </p>
      <p className="prof-about-disclaimer">
        PULSO entrega orientación general de bienestar y entrenamiento. No reemplaza la evaluación de un profesional de salud. Si sientes dolor, mareos o malestar, detente y consulta.
      </p>
      <p className="prof-about-version num">Versión {appVersion}</p>
    </section>
  );
}
