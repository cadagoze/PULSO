/** «8.420», «72,4», «05» o «12» → número, decimales y ceros a la izquierda; null si el texto no es sólo un número. */
export function parseCount(text: string): { value: number; digits: number; pad: number } | null {
  const match = /^(-?\d{1,3}(?:\.\d{3})*|-?\d+)(?:,(\d+))?$/.exec(text.trim());
  if (!match) return null;
  const digits = match[2]?.length ?? 0;
  const pad = /^0\d/.test(match[1]) ? match[1].length : 0;
  return { value: Number(`${match[1].replace(/\./g, "")}.${match[2] ?? "0"}`), digits, pad };
}

export function formatCount(value: number, digits: number, pad = 0) {
  const text = value.toLocaleString("es-CL", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return pad ? text.padStart(pad, "0") : text;
}
