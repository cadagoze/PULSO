"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { CloudOff, CloudUpload, LogOut, Trash2 } from "lucide-react";
import { Button, Sheet } from "@/components/ui";
import { SignInSheet } from "@/components/cloud/sign-in-sheet";
import { hasCloudSession, type CloudStatus } from "@/lib/cloud/status";
import { cloudActions, useCloudStatus } from "@/lib/cloud/use-cloud";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { DuplicatesNotice } from "@/components/profile/duplicates";

const clock = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" });

function syncLine(status: CloudStatus, now: number) {
  if (status.phase === "starting") return "Conectando con tu cuenta…";
  if (status.phase === "syncing") return "Guardando en la nube…";
  if (status.phase === "offline") return "Sin conexión · se guardará al volver";
  if (status.phase === "error") return status.message ?? "No se pudo sincronizar.";
  if (!status.lastSyncedAt) return "Todo guardado";
  const minutes = Math.floor((now - status.lastSyncedAt) / 60_000);
  if (minutes < 1) return "Todo guardado · recién";
  if (minutes < 60) return `Todo guardado · hace ${minutes} min`;
  return `Todo guardado · a las ${clock.format(status.lastSyncedAt)}`;
}

/** Cuenta en Perfil: invitación a guardar los datos en la nube o el estado de la sincronización. */
export function CloudAccount({ onToast }: { onToast: (message: string) => void }) {
  const status = useCloudStatus();
  const now = useNow(30_000);
  const [signIn, setSignIn] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const user = status.user;
  // Hay sesión guardada pero Firebase aún no responde: no mostrar la invitación por error.
  const connecting = !user && status.phase === "starting" && hasCloudSession();

  async function signOut() {
    setBusy(true);
    try {
      await cloudActions.signOut();
      onToast("Sesión cerrada · tus datos siguen en este equipo");
    } catch (error) {
      onToast(await cloudActions.errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cloud-card rise" style={{ "--i": 1 } as CSSProperties} aria-labelledby="cloud-title">
      <h2 id="cloud-title" className="meta">Cuenta</h2>
      {user ? (
        <div className="cloud-panel">
          <div className="cloud-user">
            {user.photo
              // eslint-disable-next-line @next/next/no-img-element -- foto remota de Google, pequeña y sin optimizar
              ? <img src={user.photo} alt="" className="cloud-avatar" referrerPolicy="no-referrer" />
              : <span className="cloud-avatar" aria-hidden="true">{(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}</span>}
            <span className="grow">
              <strong>{user.name ?? user.email}</strong>
              {user.name && <small>{user.email}</small>}
            </span>
          </div>
          <p className={cn("cloud-status", `is-${status.phase}`)} aria-live="polite">
            <span className="cloud-dot" aria-hidden="true" />
            {syncLine(status, now)}
          </p>
          <DuplicatesNotice />
          <div className="cloud-actions">
            <Button variant="secondary" size="s" disabled={busy} onClick={() => void signOut()}><LogOut size={16} />Cerrar sesión</Button>
            <Button variant="ghost" size="s" className="cloud-danger" disabled={busy} onClick={() => setRemoving(true)}><Trash2 size={16} />Eliminar cuenta</Button>
          </div>
        </div>
      ) : connecting ? (
        <div className="cloud-panel"><p className="cloud-status is-starting"><span className="cloud-dot" aria-hidden="true" />Conectando con tu cuenta…</p></div>
      ) : (
        <div className="cloud-panel cloud-invite">
          <span className="icon-tile" aria-hidden="true"><CloudOff size={19} /></span>
          <div className="grow">
            <strong>Tus datos viven sólo en este teléfono</strong>
            <p>Crea una cuenta para guardarlos en la nube y usarlos en otros equipos. Sigue funcionando sin conexión.</p>
            <Button size="s" onClick={() => setSignIn(true)}><CloudUpload size={16} />Guardar en la nube</Button>
          </div>
        </div>
      )}
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={onToast} />
      {user && <DeleteAccountSheet open={removing} provider={user.provider} onClose={() => setRemoving(false)} onDone={onToast} />}
    </section>
  );
}

/** Eliminar la cuenta: confirma la identidad (Google o contraseña) y borra todo lo de la nube. */
function DeleteAccountSheet({ open, provider, onClose, onDone }: { open: boolean; provider: "google" | "password"; onClose: () => void; onDone: (message: string) => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await cloudActions.deleteAccount(provider === "password" ? password : undefined);
      onClose();
      onDone("Cuenta eliminada · se borró todo lo guardado en la nube");
    } catch (caught) {
      setError(await cloudActions.errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Tu cuenta" title="Eliminar cuenta" className="cloud-sheet">
      <div className="cloud-signin">
        <p className="cloud-lead">Se borran tu cuenta y todo lo guardado en la nube. No se puede deshacer. Lo que hay en este teléfono se conserva; puedes borrarlo después en <Link href="/ajustes#datos" onClick={onClose}>Ajustes</Link>.</p>
        {provider === "password" ? (
          <label className="field">
            Confirma tu contraseña
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
        ) : (
          <p className="cloud-hint">Te pediremos elegir tu cuenta de Google para confirmar que eres tú.</p>
        )}
        {error && <p className="cloud-error" role="alert">{error}</p>}
        <Button variant="danger" size="l" block disabled={busy || (provider === "password" && !password)} onClick={() => void remove()}>
          <Trash2 size={18} />{busy ? "Eliminando…" : "Eliminar cuenta y datos"}
        </Button>
      </div>
    </Sheet>
  );
}
