/** Estado de la cuenta y la sincronización, compartido por toda la app (sin depender de Firebase). */

export interface CloudUser { uid: string; email: string | null; name: string | null; photo: string | null; provider: "google" | "password" }

export type CloudPhase = "off" | "starting" | "syncing" | "synced" | "offline" | "error";

export interface CloudStatus { phase: CloudPhase; user: CloudUser | null; lastSyncedAt: number | null; message: string | null }

/** Marca local de que hay una sesión abierta: así sólo se carga Firebase cuando hace falta. */
export const CLOUD_SESSION_KEY = "pulso:cloud-session";
/** Huellas y cursores de la sincronización de este equipo (no forman parte del respaldo). */
export const CLOUD_SYNC_KEY = "pulso:cloud-sync";

const initial: CloudStatus = { phase: "off", user: null, lastSyncedAt: null, message: null };
let status = initial;
const listeners = new Set<() => void>();

export function getCloudStatus() {
  return status;
}

export function getServerCloudStatus() {
  return initial;
}

export function setCloudStatus(patch: Partial<CloudStatus>) {
  status = { ...status, ...patch };
  for (const listener of listeners) listener();
}

export function subscribeCloudStatus(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function hasCloudSession() {
  try {
    return window.localStorage.getItem(CLOUD_SESSION_KEY) !== null;
  } catch {
    return false;
  }
}
