/** Marca de PULSO para íconos generados (ImageResponse): una "P" lima con punto sobre verde bosque. */
export const brandColors = { forest: "#1e3026", lime: "#b7f34a" } as const;

export function BrandMark({ size, rounded }: { size: number; rounded: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: brandColors.forest,
        borderRadius: rounded ? size * 0.22 : 0,
      }}
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 100 100">
        <path
          fill={brandColors.lime}
          fillRule="evenodd"
          d="M24 16 H54 A23 23 0 0 1 54 62 H42 V84 H24 Z M42 32 H52 A7.5 7.5 0 0 1 52 47 H42 Z"
        />
        <circle cx="76" cy="76" r="8" fill={brandColors.lime} />
      </svg>
    </div>
  );
}
