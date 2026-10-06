import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Privacidad" };

/** Qué datos guarda PULSO, dónde, quién puede verlos y cómo borrarlos. */
export default function PrivacyPage() {
  return (
    <div className="page privacy-page">
      <PageHeader backHref="/perfil" meta="Actualizada el 6 de octubre de 2026" title="Privacidad" subtitle="Qué guarda PULSO, dónde y cómo borrarlo." />
      <article className="privacy">
        <section>
          <h2>Qué guardamos</h2>
          <p>Lo que registras en la app: entrenamientos, comidas, agua, peso, medidas, tu evaluación inicial, tu plan de alimentación, tus ajustes y tu foto de perfil. Parte de esto es información sobre tu salud.</p>
        </section>
        <section>
          <h2>Dónde se guarda</h2>
          <p>Sin cuenta, todo queda sólo en el navegador de tu equipo. Si creas una cuenta, también se guarda en Google Firebase (Cloud Firestore), en servidores de Santiago de Chile, y el inicio de sesión lo gestiona Firebase Authentication. Los datos viajan cifrados y se almacenan cifrados.</p>
        </section>
        <section>
          <h2>Avisos</h2>
          <p>Si activas las notificaciones, tu teléfono guarda una suscripción en el servidor de PULSO (Cloudflare) con tu zona horaria, los avisos que elegiste y un resumen mínimo del día: si entrenaste hoy, cuántas sesiones llevas en la semana y tu meta, tu racha, si registraste comidas (sin detalle) y tus vasos de agua. No incluye tu nombre, correo, comidas, peso ni medidas. Los avisos pasan por el servicio de notificaciones de tu navegador (Google, Apple o Mozilla). Al desactivarlos se borra la suscripción.</p>
        </section>
        <section>
          <h2>Quién puede verlos</h2>
          <p>Las reglas de la base de datos sólo permiten que tu cuenta lea y escriba tus datos. El responsable de PULSO tiene acceso técnico a la base de datos para mantenerla; no revisa tu información ni la usa para otros fines.</p>
        </section>
        <section>
          <h2>Para qué se usan</h2>
          <p>Sólo para respaldar tus datos, sincronizarlos entre tus equipos y, si los activas, enviarte avisos. PULSO no muestra publicidad, no vende ni comparte tus datos y no usa herramientas de analítica de terceros.</p>
        </section>
        <section>
          <h2>Cuánto tiempo</h2>
          <p>Mientras mantengas tu cuenta. El registro de alimentos y de agua conserva los últimos 120 días.</p>
        </section>
        <section>
          <h2>Tus derechos</h2>
          <p>Puedes ver y exportar todos tus datos (Ajustes → Tus datos → Exportar respaldo), corregirlos desde la app y eliminar tu cuenta con todo lo guardado en la nube (Perfil → Cuenta → Eliminar cuenta). Estos derechos se basan en la ley chilena de protección de datos personales (Ley 19.628 y su reforma, Ley 21.719).</p>
        </section>
        <p className="privacy-back"><Link href="/perfil">Volver a Perfil</Link></p>
      </article>
    </div>
  );
}
