"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { Button, Sheet } from "@/components/ui";
import { exportCsv, exportJson } from "@/components/progress/export";
import type { WorkoutEntry } from "@/types";

/** Exportaciones: entrenamientos serie por serie (CSV) y respaldo completo (JSON, restaurable desde Perfil). */
export function ExportSheet({ open, onClose, workouts }: { open: boolean; onClose: () => void; workouts: WorkoutEntry[] }) {
  return (
    <Sheet open={open} onClose={onClose} eyebrow="Tus datos" title="Exportar">
      <p className="muted prog-sheet-help">Tu historial se guarda en este navegador. Descárgalo de vez en cuando como respaldo.</p>
      <div className="prog-export-actions">
        <Button variant="secondary" block onClick={() => exportCsv(workouts)} disabled={!workouts.length}>
          <FileSpreadsheet size={17} aria-hidden="true" />
          Entrenamientos (CSV)
        </Button>
        <Button variant="secondary" block onClick={() => exportJson()}>
          <Download size={17} aria-hidden="true" />
          Respaldo completo (JSON)
        </Button>
      </div>
      <p className="subtle prog-sheet-help">El CSV trae cada serie, lista para una planilla. El respaldo JSON se restaura desde Perfil.</p>
    </Sheet>
  );
}
