"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, subtitle, backHref, actions }: { eyebrow?: string; title: string; subtitle?: string; backHref?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {backHref && <Link href={backHref} className="icon-button back" aria-label="Volver"><ArrowLeft size={20} /></Link>}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}

export function SectionHeader({ title, action, href, children }: { title: string; action?: string; href?: string; children?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action && href && <Link href={href}>{action}<ArrowRight size={15} /></Link>}
      {children}
    </div>
  );
}

export function PrimaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("button button-primary", className)} {...props}>{children}</button>;
}

export function SecondaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("button button-secondary", className)} {...props}>{children}</button>;
}

export function ProgressBar({ value, purple = false, label }: { value: number; purple?: boolean; label?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={Math.round(safe)} aria-valuemin={0} aria-valuemax={100}><span className={purple ? "purple" : ""} style={{ width: `${safe}%` }} /></div>;
}

export function ProgressRing({ value, size = 112, stroke, color, children, label }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode; label?: string }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-ring" style={{ width: size, height: size }} role={label ? "img" : undefined} aria-label={label}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r={radius} style={stroke ? { strokeWidth: stroke } : undefined} />
        <circle className="ring-value" cx="50" cy="50" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - safe / 100)} style={{ ...(stroke ? { strokeWidth: stroke } : {}), ...(color ? { stroke: color } : {}) }} />
      </svg>
      <div className="ring-content">{children}</div>
    </div>
  );
}

export function StatusBadge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "purple" | "muted" | "warn" | "danger" | "solid" }) {
  const toneClass = { green: "", purple: "badge-violet", muted: "badge-muted", warn: "badge-warn", danger: "badge-danger", solid: "badge-solid" }[tone];
  return <span className={cn("badge", toneClass)}>{children}</span>;
}

/** Hojas abiertas, de la más antigua a la más reciente: sólo la superior responde al teclado. */
const sheetStack: symbol[] = [];

/** Hoja inferior (diálogo centrado en escritorio) con foco atrapado, Escape y bloqueo de scroll. */
export function Sheet({ open, onClose, title, eyebrow, children, labelledBy, className }: { open: boolean; onClose: () => void; title?: ReactNode; eyebrow?: string; children: ReactNode; labelledBy?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!open) return;
    const token = Symbol("sheet");
    sheetStack.push(token);
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusable = () => Array.from(node?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? []);
    (focusable()[0] ?? node)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (sheetStack.at(-1) !== token) return;
      if (event.key === "Escape") { event.stopPropagation(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      sheetStack.splice(sheetStack.indexOf(token), 1);
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <div ref={ref} tabIndex={-1} className={cn("sheet", className)} role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? (title ? titleId : undefined)} onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        {title && (
          <header className="sheet-head">
            <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2 id={titleId}>{title}</h2></div>
            <button className="btn-icon small" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
          </header>
        )}
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: Array<{ value: T; label: string }>; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} role="tab" aria-selected={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, label, format }: { value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; label: string; format?: (value: number) => string }) {
  const clamp = (next: number) => Math.max(min, Math.min(max, Math.round(next * 100) / 100));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label={`Disminuir ${label}`}><Minus size={16} /></button>
      <output aria-live="polite">{format ? format(value) : value}</output>
      <button type="button" onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label={`Aumentar ${label}`}><Plus size={16} /></button>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <span className="icon-tile muted">{icon}</span>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Stat({ value, label, className }: { value: ReactNode; label: ReactNode; className?: string }) {
  return <div className={cn("stat", className)}><b>{value}</b><span>{label}</span></div>;
}
