/**
 * Isotipo de PULSO (logo 2, 2026-10-07): una «P» con la panza abierta y el asta convertida en una
 * cuchilla en diagonal, como un paso hacia adelante. Caja de 100 × 88; lo usan los íconos, el logo
 * de la app y la imagen compartible.
 */
export const brandColors = { black: "#0a0a0a", red: "#ff351f", warm: "#ff7a2f" } as const;

export const isotype = {
  viewBox: "0 0 100 88",
  ratio: 88 / 100,
  paths: [
    "M0 0H84A16 16 0 0 1 100 16V46A16 16 0 0 1 84 62H36V49A7 7 0 0 1 43 42H67A7 7 0 0 0 74 35V24.5H0Z",
    "M0 54L32.5 28V62L0 88Z",
  ],
} as const;
