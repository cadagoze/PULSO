/** Archivo principal de la app: su nombre lleva un hash que cambia con cada publicación. */
const ENTRY = /\/_next\/static\/chunks\/index-[\w-]+\.js/;

export function entryChunk(html: string) {
  return html.match(ENTRY)?.[0] ?? null;
}

/** ¿El HTML recién pedido al servidor apunta a otra versión que la abierta? (Sin datos para comparar, no.) */
export function hasNewVersion(currentHtml: string, latestHtml: string) {
  const current = entryChunk(currentHtml);
  const latest = entryChunk(latestHtml);
  return Boolean(current && latest && current !== latest);
}
