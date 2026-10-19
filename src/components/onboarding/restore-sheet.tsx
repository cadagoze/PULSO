"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ChevronRight, CloudDownload, FileUp } from "lucide-react";
import { Sheet } from "@/components/ui";
import { parseBackup } from "@/components/profile/data-export";
import { STORAGE_KEYS, writeAllData } from "@/lib/store";

/**
 * «Ya tengo PULSO» en la bienvenida: recuperar los datos con la cuenta (desde la nube) o con un respaldo
 * (.json exportado en Ajustes). Si traen la evaluación, la app pasa directo a Inicio, sin repetirla.
 */
export function RestoreSheet({ open, onClose, onSignIn, onImported }: { open: boolean; onClose: () => void; onSignIn: () => void; onImported: (hasPlan: boolean) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const { data } = parseBackup(await file.text(), Object.values(STORAGE_KEYS));
      writeAllData(data);
      setError(null);
      onClose();
      onImported(Boolean(data[STORAGE_KEYS.profile]));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos leer el respaldo.");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Ya tengo PULSO" title="Recupera tus datos">
      <div className="onb-restore">
        <p className="muted">Trae tus entrenamientos, comidas y plan, y sigue donde quedaste. No repites la evaluación.</p>
        <div className="list">
          <button type="button" className="list-row" onClick={() => { onClose(); onSignIn(); }}>
            <span className="icon-tile" aria-hidden="true"><CloudDownload size={19} /></span>
            <span className="grow"><strong>Con tu cuenta</strong><small>Google o correo: tus datos bajan de la nube.</small></span>
            <ChevronRight size={18} className="subtle" aria-hidden="true" />
          </button>
          <button type="button" className="list-row" onClick={() => fileRef.current?.click()}>
            <span className="icon-tile" aria-hidden="true"><FileUp size={19} /></span>
            <span className="grow"><strong>Con un respaldo</strong><small>El archivo .json que exportaste en Ajustes → Datos y privacidad.</small></span>
            <ChevronRight size={18} className="subtle" aria-hidden="true" />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Archivo de respaldo" onChange={importFile} />
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </Sheet>
  );
}
