import { brandColors, isotype } from "@/components/brand/isotype";

/**
 * Ícono de la app (ImageResponse): isotipo con el gradiente de marca sobre negro y un brillo cálido
 * en la esquina. `scale` es el ancho del isotipo respecto del ícono.
 */
export function BrandMark({ size, rounded, scale = 0.6, glow = true }: { size: number; rounded: boolean; scale?: number; glow?: boolean }) {
  const width = Math.round(size * scale);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // La cuchilla pesa menos que la panza: se baja un poco para que se vea centrada.
        paddingTop: size * 0.05,
        backgroundColor: brandColors.black,
        // ImageResponse no acepta propiedades indefinidas: el brillo se agrega sólo si va.
        ...(glow ? { backgroundImage: "radial-gradient(circle at 0% 0%, rgba(255, 53, 31, 0.34), rgba(255, 53, 31, 0) 56%)" } : {}),
        borderRadius: rounded ? size * 0.22 : 0,
      }}
    >
      <svg width={width} height={Math.round(width * isotype.ratio)} viewBox={isotype.viewBox}>
        <defs>
          <linearGradient id="pulso-brand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={brandColors.red} />
            <stop offset="1" stopColor={brandColors.warm} />
          </linearGradient>
        </defs>
        {isotype.paths.map((d) => <path key={d} d={d} fill="url(#pulso-brand)" />)}
      </svg>
    </div>
  );
}
