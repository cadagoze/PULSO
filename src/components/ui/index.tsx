"use client";

import Link from "@/components/ui/app-link";
import { useEffect, useId, useRef, useState } from "react";
import type { AnchorHTMLAttributes, AnimationEvent, ButtonHTMLAttributes, CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, meta, title, subtitle, backHref, actions }: { eyebrow?: string; meta?: ReactNode; title: string; subtitle?: string; backHref?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {backHref && <Link href={backHref} className="icon-button back" aria-label="Volver"><ArrowLeft size={20} /></Link>}
        {meta && <p className="meta">{meta}</p>}
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

// ─── Botones ──────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "dark" | "ghost" | "glass" | "danger";
type ButtonSize = "s" | "m" | "l";
type ButtonStyle = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean };

function buttonClass({ variant = "primary", size = "m", block = false }: ButtonStyle, className?: string) {
  return cn("btn", `btn-${variant}`, size === "s" && "btn-small", size === "l" && "btn-large", block && "btn-block", className);
}

/** Botón con la forma de PULSO: píldora, respuesta táctil (escala 0,97) y variantes de color. */
export function Button({ variant, size, block, className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle) {
  return <button type={type} className={buttonClass({ variant, size, block }, className)} {...props} />;
}

/** Enlace con aspecto de botón (navegación a otra pantalla). */
export function ButtonLink({ href, variant, size, block, className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & ButtonStyle & { href: string }) {
  return <Link href={href} className={buttonClass({ variant, size, block }, className)} {...props} />;
}

export function PrimaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("button button-primary", className)} {...props}>{children}</button>;
}

export function SecondaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("button button-secondary", className)} {...props}>{children}</button>;
}

// ─── Progreso y métricas ──────────────────────────────────────────────────

export function ProgressBar({ value, purple = false, tone, label }: { value: number; purple?: boolean; tone?: "accent" | "gold"; label?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={Math.round(safe)} aria-valuemin={0} aria-valuemax={100}>
      <span className={purple ? "purple" : tone === "gold" ? "gold" : undefined} style={{ "--value": safe / 100 } as CSSProperties} />
    </div>
  );
}

/** Anillo de progreso: se dibuja al aparecer y luego sigue el valor con una transición suave. */
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

/**
 * Número protagonista (tipografía editorial). Para fracciones como 2/3, pasa el divisor atenuado:
 * `value={<>2<span className="nmetric-soft">/3</span></>}`.
 */
export function NumberMetric({ value, unit, label, size = "m", className }: { value: ReactNode; unit?: ReactNode; label?: ReactNode; size?: "xl" | "l" | "m" | "s"; className?: string }) {
  return (
    <div className={cn("nmetric", `nmetric-${size}`, className)}>
      <span className="nmetric-value">{value}{unit !== undefined && <span className="nmetric-unit">{unit}</span>}</span>
      {label && <span className="nmetric-label">{label}</span>}
    </div>
  );
}

/** Métrica compacta (número + etiqueta) para filas y tarjetas pequeñas. */
export function Metric({ value, unit, label, className }: { value: ReactNode; unit?: ReactNode; label: ReactNode; className?: string }) {
  return <NumberMetric value={value} unit={unit} label={label} size="s" className={className} />;
}

/** Línea de datos separados por puntos: «6 ejercicios · 40 min · Casa». */
export function MetaLine({ items, className }: { items: ReactNode[]; className?: string }) {
  const visible = items.filter((item) => item !== null && item !== undefined && item !== false && item !== "");
  return <p className={cn("meta-dots", className)}>{visible.map((item, index) => <span key={index}>{item}</span>)}</p>;
}

export function StatusBadge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "purple" | "muted" | "warn" | "danger" | "solid" | "gold" | "ink" }) {
  const toneClass = { green: "", purple: "badge-violet", muted: "badge-muted", warn: "badge-warn", danger: "badge-danger", solid: "badge-solid", gold: "badge-gold", ink: "badge-ink" }[tone];
  return <span className={cn("badge", toneClass)}>{children}</span>;
}

export function Stat({ value, label, className }: { value: ReactNode; label: ReactNode; className?: string }) {
  return <div className={cn("stat", className)}><b>{value}</b><span>{label}</span></div>;
}

// ─── Hojas ────────────────────────────────────────────────────────────────

/** Hojas abiertas, de la más antigua a la más reciente: sólo la superior responde al teclado. */
const sheetStack: symbol[] = [];
/** Distancia (px) o velocidad (px/ms) de arrastre que cierra la hoja. */
const DRAG_CLOSE = { distance: 110, velocity: 0.6 };

type SheetProps = { open: boolean; onClose: () => void; title?: ReactNode; eyebrow?: string; children: ReactNode; labelledBy?: string; className?: string };

/**
 * Hoja inferior (diálogo centrado en escritorio): entra desde abajo, se cierra deslizando hacia abajo,
 * con fondo desenfocado, foco atrapado, Escape y bloqueo de scroll. Anima también la salida.
 */
export function Sheet({ open, onClose, title, eyebrow, children, labelledBy, className }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  const drag = useRef<{ startY: number; y: number; startTime: number } | null>(null);
  // Sigue montada mientras se anima la salida.
  const [present, setPresent] = useState(open);
  const [previousOpen, setPreviousOpen] = useState(open);
  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) setPresent(true);
  }
  const closing = present && !open;

  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!open) return;
    const token = Symbol("sheet");
    sheetStack.push(token);
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.style.removeProperty("--drag-y");
    const focusable = () => Array.from(node?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? []);
    (focusable()[0] ?? node)?.focus({ preventScroll: true });
    const onKey = (event: globalThis.KeyboardEvent) => {
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
    // En el teléfono el teclado no achica la pantalla para los elementos fijos (iPhone): la hoja
    // sigue el área visible para quedar sobre el teclado y no detrás.
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const syncViewport = () => {
      if (!viewport) return;
      root.style.setProperty("--vv-top", `${viewport.offsetTop}px`);
      root.style.setProperty("--vv-height", `${viewport.height}px`);
      root.classList.toggle("keyboard-open", window.innerHeight - viewport.height > 150);
    };
    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    return () => {
      sheetStack.splice(sheetStack.indexOf(token), 1);
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      if (!sheetStack.length) {
        root.style.removeProperty("--vv-top");
        root.style.removeProperty("--vv-height");
        root.classList.remove("keyboard-open");
      }
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const onAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (closing && event.target === event.currentTarget) setPresent(false);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!open || window.matchMedia("(min-width: 720px)").matches) return;
    drag.current = { startY: event.clientY, y: 0, startTime: event.timeStamp };
    event.currentTarget.setPointerCapture(event.pointerId);
    ref.current?.classList.add("is-dragging");
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || !ref.current) return;
    state.y = Math.max(0, event.clientY - state.startY);
    ref.current.style.transform = `translateY(${state.y}px)`;
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const node = ref.current;
    drag.current = null;
    if (!state || !node) return;
    node.classList.remove("is-dragging");
    const velocity = state.y / Math.max(1, event.timeStamp - state.startTime);
    if (state.y > DRAG_CLOSE.distance || (state.y > 40 && velocity > DRAG_CLOSE.velocity)) {
      node.style.setProperty("--drag-y", `${state.y}px`);
      node.style.transform = "";
      closeRef.current();
      return;
    }
    // Vuelve a su sitio con la misma curva del sistema.
    node.style.transition = "transform var(--motion-base) var(--ease-standard)";
    node.style.transform = "";
    node.addEventListener("transitionend", () => { node.style.transition = ""; }, { once: true });
  };

  if (!present) return null;
  return (
    <div className={cn("sheet-backdrop", closing && "is-closing")} onMouseDown={() => { if (!closing) onClose(); }}>
      <div
        ref={ref}
        tabIndex={-1}
        className={cn("sheet", closing && "is-closing", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
        onMouseDown={(event) => event.stopPropagation()}
        onAnimationEnd={onAnimationEnd}
      >
        <div className="sheet-grab" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} aria-hidden="true">
          <span className="sheet-handle" />
        </div>
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

/** Alias con el nombre del sistema de componentes. */
export const BottomSheet = Sheet;

// ─── Controles ────────────────────────────────────────────────────────────

/**
 * Control segmentado: el indicador se desliza entre opciones. Flechas izquierda/derecha para cambiar.
 * Con `value={null}` no hay opción elegida (preguntas sin responder) y el indicador queda oculto.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, label, size = "m", className }: { options: Array<{ value: T; label: string }>; value: T | null; onChange: (value: T) => void; label: string; size?: "s" | "m" | "l"; className?: string }) {
  const selected = options.findIndex((option) => option.value === value);
  const index = Math.max(0, selected);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = selected < 0 ? 0 : (index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    onChange(options[next].value);
    event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  };
  return (
    <div
      className={cn("segmented", size === "l" && "segmented-l", size === "s" && "segmented-s", selected < 0 && "is-empty", className)}
      role="tablist"
      aria-label={label}
      style={{ "--count": options.length, "--index": index } as CSSProperties}
      onKeyDown={onKeyDown}
    >
      <span className="segmented-indicator" aria-hidden="true" />
      {options.map((option, position) => (
        <button key={option.value} type="button" role="tab" aria-selected={value === option.value} tabIndex={position === index ? 0 : -1} onClick={() => onChange(option.value)}>{option.label}</button>
      ))}
    </div>
  );
}

/** Nombre anterior del control segmentado. */
export const Segmented = SegmentedControl;

/** Chip seleccionable (equipamiento, filtros): al activarse muestra un check con un pequeño rebote. */
export function ToggleChip({ pressed, onChange, icon, children, className }: { pressed: boolean; onChange: (pressed: boolean) => void; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <button type="button" className={cn("chip", className)} aria-pressed={pressed} onClick={() => onChange(!pressed)}>
      {pressed ? <span className="chip-check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span> : icon}
      {children}
    </button>
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
