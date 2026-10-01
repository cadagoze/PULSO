"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, HardDriveDownload, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Sheet } from "@/components/ui";
import { STORAGE_KEYS, clearAllData, readAllData, writeAllData } from "@/lib/store";
import type { WorkoutEntry } from "@/types";
import { backupVersion, downloadFile, fileStamp, parseBackup, workoutsCsv } from "./data-export";
import type { BackupEnvelope } from "./data-export";
import { SettingsGroup } from "./settings-group";

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

export function DataSection({ workouts, onToast }: { workouts: WorkoutEntry[]; onToast: (message: string) => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [persist, setPersist] = useState<PersistStatus>("checking");
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
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

  function eraseEverything() {
    clearAllData();
    setDeleteStep(0);
    router.push("/");
  }

  return (
    <SettingsGroup index="06" title="Tus datos" description="Todo se guarda en este navegador. Respáldalo de vez en cuando." id="prof-data">
      <button type="button" className="prof-row prof-row-action" onClick={exportBackup}>
        <span className="icon-tile"><Download size={19} /></span>
        <span className="prof-row-text">
          <strong>Exportar respaldo</strong>
          <small>Un archivo .json con todo lo que has registrado.</small>
        </span>
      </button>
      <button type="button" className="prof-row prof-row-action" onClick={() => fileRef.current?.click()}>
        <span className="icon-tile"><Upload size={19} /></span>
        <span className="prof-row-text">
          <strong>Importar respaldo</strong>
          <small>Reemplaza los datos de este dispositivo por los del archivo.</small>
        </span>
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Archivo de respaldo" onChange={importBackup} />
      <button type="button" className="prof-row prof-row-action" onClick={exportCsv}>
        <span className="icon-tile"><FileSpreadsheet size={19} /></span>
        <span className="prof-row-text">
          <strong>Exportar entrenamientos</strong>
          <small>Serie por serie en .csv, listo para una planilla.</small>
        </span>
      </button>
      <div className="prof-row prof-row-action prof-persist">
        <span className="icon-tile">{persist === "persisted" ? <ShieldCheck size={19} /> : <HardDriveDownload size={19} />}</span>
        <span className="prof-row-text">
          <strong>Proteger mis datos</strong>
          <small aria-live="polite">{persistCopy[persist]}</small>
        </span>
        {persist === "persisted" ? (
          <span className="badge">Activo</span>
        ) : (
          (persist === "idle" || persist === "denied") && (
            <button type="button" className="btn btn-secondary btn-small" onClick={requestPersist}>Proteger</button>
          )
        )}
      </div>
      <button type="button" className="prof-row prof-row-action prof-danger" onClick={() => setDeleteStep(1)}>
        <span className="icon-tile prof-danger-tile"><Trash2 size={19} /></span>
        <span className="prof-row-text">
          <strong>Borrar todos mis datos</strong>
          <small>Elimina entrenamientos, ajustes y evaluación de este dispositivo.</small>
        </span>
      </button>
      {error && <p className="form-error prof-data-error" role="alert">{error}</p>}

      <Sheet open={deleteStep > 0} onClose={() => setDeleteStep(0)} title={deleteStep === 1 ? "¿Borrar todos tus datos?" : "Última confirmación"} eyebrow="Tus datos">
        {deleteStep === 1 ? (
          <div className="stack">
            <p className="muted">Se eliminarán tus {workouts.length} entrenamientos, rutinas, ajustes y evaluación. Si quieres conservarlos, exporta un respaldo antes.</p>
            <button type="button" className="btn btn-secondary btn-block" onClick={exportBackup}>Exportar respaldo primero</button>
            <button type="button" className="btn btn-danger btn-block" onClick={() => setDeleteStep(2)}>Continuar</button>
          </div>
        ) : (
          <div className="stack">
            <p className="muted">Esta acción no se puede deshacer. PULSO volverá a empezar desde cero en este dispositivo.</p>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => setDeleteStep(0)}>Cancelar</button>
            <button type="button" className="btn btn-danger btn-block" onClick={eraseEverything}>Sí, borrar todo</button>
          </div>
        )}
      </Sheet>
    </SettingsGroup>
  );
}
