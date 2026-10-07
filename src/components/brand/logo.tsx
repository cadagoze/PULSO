import { useId } from "react";
import { isotype } from "@/components/brand/isotype";
import { cn } from "@/lib/utils";

/** Isotipo en línea: del color de acento o, en la portada, con el gradiente de marca. */
export function Isotype({ gradient = false, className }: { gradient?: boolean; className?: string }) {
  const id = useId();
  return (
    <svg className={cn("isotype", className)} viewBox={isotype.viewBox} aria-hidden="true" focusable="false">
      {gradient && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--accent)" }} />
            <stop offset="1" style={{ stopColor: "var(--accent-bright)" }} />
          </linearGradient>
        </defs>
      )}
      {isotype.paths.map((d) => <path key={d} d={d} fill={gradient ? `url(#${id})` : undefined} />)}
    </svg>
  );
}

/** Logo horizontal: isotipo y «PULSO» en Archivo ancho. El tamaño sigue al `font-size`. */
export function Logo({ gradient, className }: { gradient?: boolean; className?: string }) {
  return (
    <span className={cn("logo", className)}>
      <Isotype gradient={gradient} />
      <span className="wordmark">PULSO</span>
    </span>
  );
}
