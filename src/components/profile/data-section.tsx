"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, HardDriveDownload, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Button, Sheet, StatusBadge } from "@/components/ui";
import { STORAGE_KEYS, clearAllData, readAllData, writeAllData } from "@/lib/store";
import type { WorkoutEntry } from "@/types";
import { backupVersion, downloadFile, fileStamp, parseBackup, workoutsCsv } from "./data-export";
import type { BackupEnvelope } from "./data-export";
import { SettingsGroup } from "./settings-group";
import { hasCloudSession } from "@/lib/cloud/status";
import { cloudActions } from "@/lib/cloud/use-cloud";

type PersistStatus = "checking" | "unsupported" | "persisted" | "idle" | "denied";

const persistCopy: Record<PersistStatus, string> = {
  checking: "Revisando…",
  unsupported: "Tu navegador no permite pedir almacenamiento persistente.",
  persisted: "Activado: el navegador no borrará tus datos por falta de espacio.",
  idle: "Pide al navegador que no borre tus datos al liberar espacio.",
  denied: "El navegador no lo concedió. Instalar PULSO en tu pantalla de inicio suele ayudar.",
};

function storageSupported() {
  return typeof navigator !== "undefined" && typeof navigator.storage?.persist === "function" && typeof navigator.storage?.persisted === "function";
}

function RowText({ icon, title, detail, live = false }: { icon: ReactNode; title: string; detail: string; live?: boolean }) {
  return (
    <>
      <span className="icon-tile" aria-hidden="true">{icon}</span>
      <span className="grow">
        <strong>{title}</strong>
        <small aria-live={live ? "polite" : undefined}>{detail}</small>
      </span>
    </>
  );
}

/** Respaldo, importación, CSV, almacenamiento persistente y borrado total (con doble confirmación). */
export function DataSection({ workouts, onToast, order }: { workouts: WorkoutEntry[]; onToast: (message: string) => void; order?: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [persist, setPersist] = useState<PersistStatus>("checking");
  // La hoja de borrado guarda su paso al cerrarse, para que no cambie de texto mientras sale.
  const [deleting, setDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const loggedWorkouts = workouts.reduce((total, workout) => total + (workout.records?.length ? 1 : 0), 0);

  useEffect(() => {
    let active = true;
    const check = async (): Promise<PersistStatus> => {
      if (!storageSupported()) return "unsupported";
      try {
        return (await navigator.storage.persisted()) ? "persisted" : "idle";
      } catch {
        return "unsupported";
      }
    };
    check().then((status) => {
      if (active) setPersist(status);
    });
    return () => {
      active = false;
    };
  }, []);

  function exportBackup() {
    const envelope: BackupEnvelope = { app: "PULSO", version: backupVersion, exportedAt: new Date().toISOString(), data: readAllData() };
    downloadFile(`pulso-respaldo-${fileStamp()}.json`, JSON.stringify(envelope, null, 2), "application/json");
    setError(null);
    onToast("Respaldo descargado");
  }

  function exportCsv() {
    if (!loggedWorkouts) {
      setError("Aún no hay series registradas para exportar.");
      return;
    }
    downloadFile(`pulso-entrenamientos-${fileStamp()}.csv`, workoutsCsv(workouts), "text/csv;charset=utf-8");
    setError(null);
    onToast("CSV descargado");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const { data, keys } = parseBackup(await file.text(), Object.values(STORAGE_KEYS));
      const ok = window.confirm(`Se reemplazarán ${keys.length} conjuntos de datos de este dispositivo por los del respaldo. Lo que no esté en el respaldo se conserva. ¿Continuar?`);
      if (!ok) return;
      const imported = writeAllData(data);
      setError(null);
      onToast(`Se importaron ${imported} ${imported === 1 ? "conjunto" : "conjuntos"} de datos`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos leer el respaldo.");
    }
  }

  async function requestPersist() {
    if (!storageSupported()) return;
    try {
      const granted = await navigator.storage.persist();
      setPersist(granted ? "persisted" : "denied");
      if (granted) onToast("Tus datos quedaron protegidos");
    } catch {
      setPersist("denied");
    }
  }

  function startDelete() {
    setDeleteStep(1);
    setDeleting(true);
  }

  async function eraseEverything() {
    // Con sesión abierta, primero se cierra: así borrar este equipo no borra también la nube.
    if (hasCloudSession()) await cloudActions.signOut().catch(() => undefined);
    clearAllData();
    setDeleting(false);
    router.push("/");
  }

  return (
    <>
      <SettingsGroup id="datos" index="05" title="Tus datos" description="Se guardan en este navegador y, si inicias sesión en Perfil, también en la nube." order={order}>
        <button type="button" className="list-row" onClick={exportBackup}>
          <RowText icon={<Download size={19} />} title="Exportar respaldo" detail="Un archivo .json con todo lo que has registrado." />
        </button>
        <button type="button" className="list-row" onClick={() => fileRef.current?.click()}>
          <RowText icon={<Upload size={19} />} title="Importar respaldo" detail="Reemplaza los datos de este dispositivo por los del archivo." />
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Archivo de respaldo" onChange={importBackup} />
        <button type="button" className="list-row" onClick={exportCsv}>
          <RowText icon={<FileSpreadsheet size={19} />} title="Exportar entrenamientos" detail="Serie por serie en .csv, listo para una planilla." />
        </button>
        <div className="list-row prof-persist">
          <RowText icon={persist === "persisted" ? <ShieldCheck size={19} /> : <HardDriveDownload size={19} />} title="Proteger mis datos" detail={persistCopy[persist]} live />
          {persist === "persisted" ? (
            <StatusBadge>Activo</StatusBadge>
          ) : (
            (persist === "idle" || persist === "denied") && <Button variant="secondary" size="s" onClick={requestPersist}>Proteger</Button>
          )}
        </div>
        <button type="button" className="list-row prof-danger" onClick={startDelete}>
          <RowText icon={<Trash2 size={19} />} title="Borrar todos mis datos" detail="Elimina entrenamientos, ajustes y evaluación de este dispositivo." />
        </button>
        {error && <p className="form-error prof-data-error" role="alert">{error}</p>}
      </SettingsGroup>

      <Sheet open={deleting} onClose={() => setDeleting(false)} title={deleteStep === 1 ? "¿Borrar todos tus datos?" : "Última confirmación"} eyebrow="Tus datos">
        {deleteStep === 1 ? (
          <div className="stack">
            <p className="muted">Se eliminarán tus {workouts.length} entrenamientos, rutinas, ajustes y evaluación. Si quieres conservarlos, exporta un respaldo antes.</p>
            <Button variant="secondary" block onClick={exportBackup}>Exportar respaldo primero</Button>
            <Button variant="danger" block onClick={() => setDeleteStep(2)}>Continuar</Button>
          </div>
        ) : (
          <div className="stack">
            <p className="muted">Esta acción no se puede deshacer. PULSO volverá a empezar desde cero en este dispositivo.{hasCloudSession() ? " También se cerrará tu sesión; lo guardado en la nube se conserva." : ""}</p>
            <Button variant="secondary" block onClick={() => setDeleting(false)}>Cancelar</Button>
            <Button variant="danger" block onClick={() => void eraseEverything()}>Sí, borrar todo</Button>
          </div>
        )}
      </Sheet>
    </>
  );
}
