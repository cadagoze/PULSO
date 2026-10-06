import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { NumberMetric } from "@/components/ui";
import { cn } from "@/lib/utils";

type Photo = { src: string; alt: string; position?: string };

/** Superficie base. `carbon` aplica además la paleta oscura a su contenido. */
export function Card({ tone = "default", padding = "m", className, children }: { tone?: "default" | "flat" | "carbon" | "forest" | "accent"; padding?: "m" | "l"; className?: string; children: ReactNode }) {
  return <div className={cn("card", tone !== "default" && `card-${tone}`, tone === "carbon" && "on-dark", padding === "l" && "card-l", className)}>{children}</div>;
}

/** Métrica principal dentro de una tarjeta: etiqueta arriba, número protagonista abajo. */
export function StatCard({ label, value, unit, detail, icon, href, className }: { label: string; value: ReactNode; unit?: ReactNode; detail?: ReactNode; icon?: ReactNode; href?: string; className?: string }) {
  const content = (
    <>
      <span className="stat-card-head"><span className="eyebrow">{label}</span>{icon}</span>
      <NumberMetric value={value} unit={unit} label={detail} size="m" />
    </>
  );
  if (href) return <Link href={href} className={cn("stat-card card-link", className)}>{content}</Link>;
  return <div className={cn("stat-card", className)}>{content}</div>;
}

/**
 * Fotografía protagonista con texto encima (degradado inferior y grano sutil).
 * `priority` la carga de inmediato cuando está sobre el pliegue.
 */
export function PhotoCard({ photo, tag, ratio, grain = true, priority = false, sizes = "(max-width: 720px) 100vw, 640px", className, children }: { photo: Photo; tag?: ReactNode; ratio?: string; grain?: boolean; priority?: boolean; sizes?: string; className?: string; children?: ReactNode }) {
  return (
    <div className={cn("photo photo-shade photo-card on-dark", grain && "grain", className)} style={ratio ? { aspectRatio: ratio } : undefined}>
      <Image src={photo.src} alt={photo.alt} fill sizes={sizes} preload={priority} loading={priority ? "eager" : undefined} className="photo-img" style={{ objectPosition: photo.position ?? "center" }} />
      {tag && <span className="photo-tag glass photo-card-tag">{tag}</span>}
      {children && <div className="photo-content photo-card-content">{children}</div>}
    </div>
  );
}

/**
 * Rutina o programa destacado como portada: fotografía o portada tipográfica (número grande
 * sobre atmósfera oscura con grano). Pensada para carruseles y listas de tarjetas grandes.
 */
export function RoutineCard({ href, onClick, eyebrow, title, meta, number, numberLabel, photo, tone = "dark", size = "m", progress, action, className, style }: {
  href?: string;
  onClick?: () => void;
  eyebrow?: ReactNode;
  title: string;
  meta?: ReactNode[];
  number?: string;
  numberLabel?: string;
  photo?: Photo;
  tone?: "dark" | "light" | "warm";
  size?: "m" | "l";
  /** Avance 0–100 (programa en curso): barra fina bajo los datos. */
  progress?: number;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const dark = Boolean(photo) || tone !== "light";
  const classes = cn(
    "routine-card",
    `routine-card-${size}`,
    photo ? "photo photo-shade grain" : tone === "light" ? "routine-card-light" : cn("atmosphere grain", tone === "warm" && "atmosphere-warm"),
    dark && "on-dark",
    (href || onClick) && "pressable",
    className,
  );
  const visibleMeta = (meta ?? []).filter((item) => item !== null && item !== undefined && item !== false && item !== "");
  const body = (
    <>
      {photo && <Image src={photo.src} alt={photo.alt} fill sizes={size === "l" ? "(max-width: 720px) 100vw, 640px" : "(max-width: 720px) 78vw, 320px"} className="photo-img" style={{ objectPosition: photo.position ?? "center" }} />}
      {number && (
        <span className="routine-card-number photo-content">
          <span className="num-display">{number}</span>
          {numberLabel && <span className="meta">{numberLabel}</span>}
        </span>
      )}
      <span className="routine-card-body photo-content">
        {eyebrow && <span className="meta routine-card-eyebrow">{eyebrow}</span>}
        <span className="routine-card-title">{title}</span>
        {visibleMeta.length > 0 && <span className="meta-dots routine-card-meta">{visibleMeta.map((item, index) => <span key={index}>{item}</span>)}</span>}
        {progress !== undefined && (
          <span className="progress-track routine-card-progress" role="progressbar" aria-label="Avance" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ "--value": Math.max(0, Math.min(100, progress)) / 100 } as CSSProperties} />
          </span>
        )}
      </span>
      {action && <span className="routine-card-action photo-content">{action}</span>}
    </>
  );
  if (href) return <Link href={href} className={classes} style={style}>{body}</Link>;
  if (onClick) return <button type="button" className={classes} style={style} onClick={onClick}>{body}</button>;
  return <div className={classes} style={style}>{body}</div>;
}
