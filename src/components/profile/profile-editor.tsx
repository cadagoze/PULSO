"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button, Sheet } from "@/components/ui";
import { squarePhoto } from "./photo";
import { Avatar } from "./profile-header";

type Draft = { name: string; photo?: string };

/**
 * Hoja para editar tu nombre y tu foto. Los cambios se guardan juntos con «Guardar»;
 * `onSave` devuelve false si el dispositivo no tiene espacio para guardarlos.
 */
export function ProfileEditor({ open, onClose, name, photo, onSave }: { open: boolean; onClose: () => void; name: string; photo?: string; onSave: (draft: Draft) => boolean }) {
  return (
    <Sheet open={open} onClose={onClose} eyebrow="Perfil" title="Tu foto y tu nombre">
      <EditorForm name={name} photo={photo} onSave={onSave} onDone={onClose} />
    </Sheet>
  );
}

function EditorForm({ name, photo, onSave, onDone }: { name: string; photo?: string; onSave: (draft: Draft) => boolean; onDone: () => void }) {
  const [draftName, setDraftName] = useState(name);
  const [draftPhoto, setDraftPhoto] = useState(photo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setDraftPhoto(await squarePhoto(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos usar esa imagen.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!onSave({ name: draftName.trim().slice(0, 40), photo: draftPhoto })) {
      setError("No queda espacio en este dispositivo para guardar la foto. Prueba con otra o quítala.");
      return;
    }
    onDone();
  }

  return (
    <form className="prof-form" onSubmit={submit}>
      <div className="prof-editor-photo">
        <span className="prof-avatar prof-avatar-plain" aria-busy={busy}>
          <Avatar name={draftName} photo={draftPhoto} />
        </span>
        <div className="prof-editor-actions">
          <Button variant="secondary" size="s" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Camera size={16} aria-hidden="true" />
            {busy ? "Preparando…" : draftPhoto ? "Cambiar foto" : "Añadir foto"}
          </Button>
          {draftPhoto && !busy && (
            <Button variant="ghost" size="s" onClick={() => setDraftPhoto(undefined)}>
              <Trash2 size={16} aria-hidden="true" />
              Quitar foto
            </Button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Elegir foto de perfil" onChange={pick} />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <label className="field">
        Nombre
        <input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={40} autoComplete="given-name" placeholder="Tu nombre" />
      </label>
      <p className="prof-note">Sólo se usan para saludarte. Quedan guardados en este dispositivo.</p>
      <Button type="submit" size="l" block disabled={busy}>Guardar</Button>
    </form>
  );
}
