/**
 * Parche de vinext (1.0.x): en páginas con metadata en streaming el script que ordena los íconos se
 * inserta dos veces y su `const a` se declara dos veces («Identifier 'a' has already been declared»).
 * Se encierra en un bloque para que cada copia tenga su propio alcance. Idempotente; se aplica en
 * `postinstall`. Quitarlo cuando vinext lo corrija.
 */
import fs from "node:fs";

const file = new URL("../node_modules/vinext/dist/server/app-page-route-wiring.js", import.meta.url);
if (!fs.existsSync(file)) process.exit(0);
const source = fs.readFileSync(file, "utf8");
const start = "const a='data-vinext-streamed-icon',o=";
const end = "forEach(el=>document.head.appendChild(el))`;";
if (source.includes(`{${start}`)) process.exit(0);
if (!source.includes(start) || !source.includes(end)) {
  console.warn("patch-vinext: no se encontró el script de íconos (¿vinext cambió?); sin cambios.");
  process.exit(0);
}
fs.writeFileSync(file, source.replace(start, `{${start}`).replace(end, "forEach(el=>document.head.appendChild(el))}`;"));
console.log("patch-vinext: script de íconos encerrado en un bloque.");
