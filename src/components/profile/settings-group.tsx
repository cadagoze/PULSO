import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Grupo de ajustes: título editorial con número y una lista agrupada. */
export function SettingsGroup({ index, title, description, children, id }: { index: string; title: string; description?: string; children: ReactNode; id?: string }) {
  return (
    <section className="prof-group" aria-labelledby={id ? `${id}-title` : undefined}>
      <header className="prof-group-head">
        <span className="prof-group-index num" aria-hidden="true">{index}</span>
        <div>
          <h2 id={id ? `${id}-title` : undefined}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </header>
      <div className="prof-list">{children}</div>
    </section>
  );
}

/** Fila de ajuste con título, ayuda opcional y un control a la derecha o debajo. */
export function SettingRow({ title, helper, control, below, stacked = false, className }: { title: ReactNode; helper?: ReactNode; control?: ReactNode; below?: ReactNode; stacked?: boolean; className?: string }) {
  return (
    <div className={cn("prof-row", stacked && "prof-row-stacked", className)}>
      <div className="prof-row-main">
        <div className="prof-row-text">
          <strong>{title}</strong>
          {helper && <small>{helper}</small>}
        </div>
        {control && <div className="prof-row-control">{control}</div>}
      </div>
      {below}
    </div>
  );
}
