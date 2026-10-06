import { STORAGE_KEYS, type StorageKeyName } from "@/lib/storage-keys";

/**
 * Qué se sincroniza con la nube y cómo. Lógica pura (sin Firebase) para poder probarla.
 *
 * - Historiales (entrenamientos, alimentos, peso, agua…): un documento por registro, así dos equipos
 *   suman registros en vez de pisarse.
 * - El resto (evaluación, ajustes, plan de alimentación, rutinas…): un documento por clave.
 * - El entrenamiento en curso no se sincroniza: vive sólo en el equipo donde se está entrenando.
 */

type Item = Record<string, unknown>;

export type CloudCollection = "workouts" | "foodLog" | "weights" | "water" | "readiness" | "measurements";

export interface CollectionSpec { kind: "collection"; key: string; name: CloudCollection; id: (item: Item) => string }
export interface DocSpec { kind: "doc"; key: string; name: StorageKeyName }
export type CloudSpec = CollectionSpec | DocSpec;

const byId = (item: Item) => String(item.id ?? "");
const byDate = (item: Item) => String(item.date ?? "");

export const collectionSpecs: CollectionSpec[] = [
  { kind: "collection", key: STORAGE_KEYS.workouts, name: "workouts", id: byId },
  { kind: "collection", key: STORAGE_KEYS.foodLog, name: "foodLog", id: byId },
  { kind: "collection", key: STORAGE_KEYS.weights, name: "weights", id: byDate },
  { kind: "collection", key: STORAGE_KEYS.water, name: "water", id: byDate },
  { kind: "collection", key: STORAGE_KEYS.readiness, name: "readiness", id: byDate },
  { kind: "collection", key: STORAGE_KEYS.measurements, name: "measurements", id: byDate },
];

const docNames: StorageKeyName[] = ["profile", "settings", "preference", "nutrition", "program", "routines", "routine", "favorites", "customFoods", "savedMeals", "habits", "meals"];
export const docSpecs: DocSpec[] = docNames.map((name) => ({ kind: "doc", key: STORAGE_KEYS[name], name }));

export const cloudSpecs: CloudSpec[] = [...collectionSpecs, ...docSpecs];
export const specByKey = new Map<string, CloudSpec>(cloudSpecs.map((spec) => [spec.key, spec]));

/** Id válido para Firestore (sin «/», no vacío). */
export function cloudId(id: string) {
  const clean = id.replace(/\//g, "_").trim();
  return clean && clean !== "." && clean !== ".." ? clean : "_";
}

/** Huella corta de un valor (FNV-1a sobre su JSON): detecta qué cambió sin guardar una copia. */
export function hashValue(value: unknown) {
  const text = JSON.stringify(value) ?? "";
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36) + text.length.toString(36);
}

/** Registros ordenados por fecha (y hora de término, en los entrenamientos), estable. */
export function sortRecords<T extends Item>(items: T[]) {
  const key = (item: T) => `${String(item.date ?? "")}|${String(item.completedAt ?? "")}`;
  return [...items].sort((a, b) => key(a).localeCompare(key(b)));
}

/** Huellas de lo último que quedó igual en el equipo y en la nube: por registro o por documento. */
export interface SyncShadow { collections: Partial<Record<CloudCollection, Record<string, string>>>; docs: Partial<Record<StorageKeyName, string>> }
export const emptyShadow = (): SyncShadow => ({ collections: {}, docs: {} });

export interface CollectionDiff { upserts: Array<{ id: string; json: string; hash: string }>; removals: string[] }

/** Qué subir de un historial: registros nuevos o cambiados, y los que se borraron en este equipo. */
export function diffCollection(items: Item[], spec: CollectionSpec, shadow: Record<string, string> = {}): CollectionDiff {
  const upserts: CollectionDiff["upserts"] = [];
  const present = new Set<string>();
  for (const item of items) {
    const id = cloudId(spec.id(item));
    present.add(id);
    const hash = hashValue(item);
    if (shadow[id] !== hash) upserts.push({ id, json: JSON.stringify(item), hash });
  }
  const removals = Object.keys(shadow).filter((id) => !present.has(id));
  return { upserts, removals };
}

export interface RemoteRecord { json: string; deleted: boolean }

/**
 * Primera vez que este equipo se conecta a la cuenta: une ambos lados. Gana la nube en un mismo
 * registro; lo que sólo está en el equipo se conserva (y se subirá); lo borrado en la nube se borra.
 * Devuelve las huellas de lo que ya coincide con la nube.
 */
export function mergeCollection(local: Item[], remote: Map<string, RemoteRecord>, spec: CollectionSpec) {
  const merged = new Map<string, Item>();
  for (const item of local) merged.set(cloudId(spec.id(item)), item);
  const shadow: Record<string, string> = {};
  for (const [id, record] of remote) {
    if (record.deleted) {
      merged.delete(id);
      continue;
    }
    const value = parseRecord(record.json);
    if (!value) continue;
    merged.set(id, value);
    shadow[id] = hashValue(value);
  }
  return { items: sortRecords([...merged.values()]), shadow };
}

/**
 * Un cambio que llega de la nube con la app abierta. Si este equipo tiene un cambio sin subir del
 * mismo registro, se conserva el local (se subirá después).
 */
export function applyRemoteRecord(items: Item[], id: string, record: RemoteRecord, spec: CollectionSpec, shadow: Record<string, string>) {
  const index = items.findIndex((item) => cloudId(spec.id(item)) === id);
  const local = index >= 0 ? items[index] : undefined;
  if (local && shadow[id] !== undefined && hashValue(local) !== shadow[id]) return { items, changed: false };
  if (record.deleted) {
    delete shadow[id];
    if (index < 0) return { items, changed: false };
    return { items: items.filter((_, position) => position !== index), changed: true };
  }
  const value = parseRecord(record.json);
  if (!value) return { items, changed: false };
  const hash = hashValue(value);
  shadow[id] = hash;
  if (local && hashValue(local) === hash) return { items, changed: false };
  const next = index >= 0 ? items.map((item, position) => (position === index ? value : item)) : sortRecords([...items, value]);
  return { items: next, changed: true };
}

function parseRecord(json: string): Item | null {
  try {
    const value: unknown = JSON.parse(json);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Item) : null;
  } catch {
    return null;
  }
}

export function parseJson(json: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(json) };
  } catch {
    return { ok: false };
  }
}
