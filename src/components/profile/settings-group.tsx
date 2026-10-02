import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Grupo de ajustes: etiqueta editorial (número y título), una nota opcional y la lista agrupada. */
export function SettingsGroup({ id, index, title, description, children, order = 0 }: { id: string; index: string; title: string; description?: string; children: ReactNode; order?: number }) {
  return (
    <section id={id} className="prof-group rise" style={{ "--i": order } as CSSProperties} aria-labelledby={`${id}-title`}>
      <header className="prof-group-head">
        <h2 id={`${id}-title`} className="meta"><span className="prof-group-index num" aria-hidden="true">{index}</span>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <div className="list prof-list">{children}</div>
    </section>
  );
}

/** Fila de ajuste: título y ayuda; el control va a la derecha (`control`) o debajo (`below`). */
export function SettingRow({ title, helper, control, below, className }: { title: ReactNode; helper?: ReactNode; control?: ReactNode; below?: ReactNode; className?: string }) {
  return (
    <div className={cn("prof-row", className)}>
      <div className="toggle-row prof-row-main">
        <div className="prof-row-text">
          <strong>{title}</strong>
          {helper && <small>{helper}</small>}
        </div>
        {control && <div className="prof-row-control">{control}</div>}
      </div>
      {below && <div className="prof-row-below">{below}</div>}
    </div>
  );
}
