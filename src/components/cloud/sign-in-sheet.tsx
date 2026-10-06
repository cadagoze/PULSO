"use client";

import Link from "@/components/ui/app-link";
import { useEffect, useState, type FormEvent } from "react";
import { Button, SegmentedControl, Sheet } from "@/components/ui";
import { cloudActions } from "@/lib/cloud/use-cloud";

type Mode = "signin" | "signup";

/** Logo de Google para el botón «Continuar con Google» (colores oficiales). */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/**
 * Entrar o crear una cuenta para guardar los datos en la nube: con Google o con correo y contraseña.
 * Al entrar, lo de este equipo se une con lo que ya hubiera en la cuenta.
 */
export function SignInSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: (message: string) => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | "reset" | null>(null);

  // Firebase se descarga al abrir la hoja: así la ventana de Google se abre en el mismo toque.
  useEffect(() => {
    if (open) cloudActions.preload();
  }, [open]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(kind: "google" | "email" | "reset", action: () => Promise<void>, success?: string) {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (kind === "reset") setNotice("Te enviamos un correo para crear una contraseña nueva. Revisa también la carpeta de spam.");
      else {
        onDone?.(success ?? "Sesión iniciada · guardando tus datos");
        onClose();
      }
    } catch (caught) {
      const message = await cloudActions.errorMessage(caught);
      // Cerrar la ventana de Google no es un error que haya que mostrar.
      if (!/Cerraste la ventana/.test(message)) setError(message);
    } finally {
      setBusy(null);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "signin") void run("email", () => cloudActions.signInWithEmail(email, password));
    else void run("email", () => cloudActions.createAccount(email, password), "Cuenta creada · guardando tus datos");
  }

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Tu cuenta" title="Guarda tus datos en la nube" className="cloud-sheet">
      <div className="cloud-signin">
        <p className="cloud-lead">Si cambias o pierdes el teléfono, recuperas tus entrenamientos, comidas, peso y plan. PULSO sigue funcionando sin conexión.</p>

        <Button variant="secondary" size="l" block disabled={busy !== null} onClick={() => void run("google", cloudActions.signInWithGoogle)}>
          <GoogleMark />{busy === "google" ? "Abriendo Google…" : "Continuar con Google"}
        </Button>
        {busy === "google" && (
          <button type="button" className="link-button cloud-cancel" onClick={() => setBusy(null)}>¿Se quedó pegado? Cancelar y reintentar</button>
        )}

        <p className="cloud-divider"><span>o con tu correo</span></p>

        <form className="cloud-form" onSubmit={submit} noValidate>
          <SegmentedControl
            label="Entrar o crear cuenta"
            options={[{ value: "signin", label: "Entrar" }, { value: "signup", label: "Crear cuenta" }]}
            value={mode}
            onChange={(value) => { setMode(value); setError(null); setNotice(null); }}
          />
          <label className="field">
            Correo
            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.cl" required />
          </label>
          <label className="field">
            Contraseña{mode === "signup" && <small className="cloud-hint"> · al menos 6 caracteres</small>}
            <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
          </label>
          {error && <p className="cloud-error" role="alert">{error}</p>}
          {notice && <p className="cloud-notice" role="status">{notice}</p>}
          <Button type="submit" size="l" block disabled={busy !== null || !email.trim() || password.length < (mode === "signup" ? 6 : 1)}>
            {busy === "email" ? "Un momento…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
          </Button>
          {mode === "signin" && (
            <button type="button" className="cloud-link" disabled={busy !== null || !email.trim()} onClick={() => void run("reset", () => cloudActions.resetPassword(email))}>
              ¿Olvidaste tu contraseña?{!email.trim() && " Escribe tu correo arriba."}
            </button>
          )}
        </form>

        <p className="cloud-privacy muted">
          Tus datos se guardan en Google Firebase (Santiago, Chile) y sólo tu cuenta puede leerlos desde la app. <Link href="/privacidad" onClick={onClose}>Privacidad</Link>
        </p>
      </div>
    </Sheet>
  );
}
