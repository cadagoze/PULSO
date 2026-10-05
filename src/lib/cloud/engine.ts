"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { PERSISTENT_CHANGE_EVENT, readPersistentRaw, writePersistentValue } from "@/lib/use-persistent-state";
import { firebaseConfig } from "./config";
import { CLOUD_SESSION_KEY, CLOUD_SYNC_KEY, setCloudStatus, type CloudUser } from "./status";
import {
  applyRemoteRecord,
  cloudSpecs,
  collectionSpecs,
  diffCollection,
  docSpecs,
  emptyShadow,
  hashValue,
  mergeCollection,
  parseJson,
  specByKey,
  type CollectionSpec,
  type RemoteRecord,
  type SyncShadow,
} from "./sync-plan";

/** Margen al pedir cambios desde el último visto (relojes, escrituras en vuelo). */
const SAFETY_MS = 2 * 60_000;
/** Espera tras un cambio local antes de subirlo (agrupa varios toques seguidos). */
const PUSH_DELAY_MS = 1200;
/** Si no hay respuesta inicial de la nube (sin conexión), se sigue igual. */
const FIRST_SNAPSHOT_TIMEOUT_MS = 8000;
const BATCH_SIZE = 400;

interface SyncState { uid: string; linked: boolean; cursors: Record<string, number>; shadow: SyncShadow }

let auth: Auth | null = null;
let db: Firestore | null = null;
let booted = false;
let session: Session | null = null;

function services() {
  if (!auth || !db) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    auth.languageCode = "es";
    db = getFirestore(app);
  }
  return { auth, db };
}

// ─── Estado local de la sincronización ─────────────────────────────────────

function loadState(uid: string): SyncState {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CLOUD_SYNC_KEY) ?? "null") as SyncState | null;
    if (stored && stored.uid === uid && stored.linked) return { ...stored, shadow: { collections: stored.shadow?.collections ?? {}, docs: stored.shadow?.docs ?? {} } };
  } catch {
    // Estado ilegible: se vuelve a unir con la nube.
  }
  return { uid, linked: false, cursors: {}, shadow: emptyShadow() };
}

function saveState(state: SyncState) {
  try {
    window.localStorage.setItem(CLOUD_SYNC_KEY, JSON.stringify(state));
  } catch {
    // Sin espacio: la próxima vez se vuelve a unir (no se pierden datos, sólo se repite trabajo).
  }
}

function clearLocalSession() {
  try {
    window.localStorage.removeItem(CLOUD_SYNC_KEY);
    window.localStorage.removeItem(CLOUD_SESSION_KEY);
  } catch {
    // Nada que limpiar.
  }
}

function markSession(user: User) {
  try {
    window.localStorage.setItem(CLOUD_SESSION_KEY, user.uid);
  } catch {
    // Sin la marca, la sesión igual se recupera al abrir Perfil.
  }
}

/** Historial guardado en este equipo; `null` si está dañado (entonces no se sube nada). */
function readArray(key: string): Array<Record<string, unknown>> | null {
  const raw = readPersistentRaw(key);
  if (raw === null) return [];
  const parsed = parseJson(raw);
  return parsed.ok && Array.isArray(parsed.value) ? (parsed.value as Array<Record<string, unknown>>) : null;
}

function toRecord(data: DocumentData): RemoteRecord {
  return { json: typeof data.json === "string" ? data.json : "", deleted: data.deleted === true };
}

function millis(value: unknown) {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

function toCloudUser(user: User): CloudUser {
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    photo: user.photoURL,
    provider: user.providerData.some((item) => item.providerId === "google.com") ? "google" : "password",
  };
}

function online() {
  return typeof navigator === "undefined" || navigator.onLine;
}

// ─── Sesión de sincronización ──────────────────────────────────────────────

class Session {
  private state: SyncState;
  private unsubscribers: Unsubscribe[] = [];
  private timers = new Map<string, number>();
  private pending = 0;
  private stopped = false;

  constructor(readonly uid: string) {
    this.state = loadState(uid);
  }

  private root(): DocumentReference {
    return doc(services().db, "users", this.uid);
  }

  async start() {
    setCloudStatus({ phase: "starting", message: null });
    try {
      if (!this.state.linked) await this.link();
      if (this.stopped) return;
      await this.listen();
      if (this.stopped) return;
      window.addEventListener(PERSISTENT_CHANGE_EVENT, this.onLocalChange);
      window.addEventListener("online", this.onConnection);
      window.addEventListener("offline", this.onConnection);
      // Sube lo que cambió mientras la app estuvo cerrada (o lo que sólo estaba en este equipo).
      for (const spec of cloudSpecs) this.schedule(spec.key, 0);
      if (!this.timers.size) this.markSynced();
    } catch (error) {
      this.fail(error);
    }
  }

  stop() {
    this.stopped = true;
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    for (const timer of this.timers.values()) window.clearTimeout(timer);
    this.timers.clear();
    window.removeEventListener(PERSISTENT_CHANGE_EVENT, this.onLocalChange);
    window.removeEventListener("online", this.onConnection);
    window.removeEventListener("offline", this.onConnection);
  }

  /** Primera conexión de este equipo con la cuenta: trae todo y lo une con lo local. */
  private async link() {
    const root = this.root();
    const shadow = emptyShadow();
    const cursors: Record<string, number> = {};

    for (const spec of collectionSpecs) {
      const snapshot = await getDocs(collection(root, spec.name));
      const remote = new Map<string, RemoteRecord>();
      let latest = 0;
      snapshot.forEach((item) => {
        const data = item.data();
        remote.set(item.id, toRecord(data));
        latest = Math.max(latest, millis(data.updatedAt));
      });
      cursors[spec.name] = latest;
      const local = readArray(spec.key);
      if (!local) continue;
      const merged = mergeCollection(local, remote, spec);
      shadow.collections[spec.name] = merged.shadow;
      if (hashValue(merged.items) !== hashValue(local)) writePersistentValue(spec.key, merged.items);
    }

    const docs = await getDocs(collection(root, "docs"));
    let latestDoc = 0;
    const remoteDocs = new Map<string, RemoteRecord>();
    docs.forEach((item) => {
      const data = item.data();
      remoteDocs.set(item.id, toRecord(data));
      latestDoc = Math.max(latestDoc, millis(data.updatedAt));
    });
    cursors.docs = latestDoc;
    for (const spec of docSpecs) {
      const record = remoteDocs.get(spec.name);
      if (!record || record.deleted) continue;
      const parsed = parseJson(record.json);
      if (!parsed.ok) continue;
      shadow.docs[spec.name] = hashValue(parsed.value);
      if (readPersistentRaw(spec.key) !== JSON.stringify(parsed.value)) writePersistentValue(spec.key, parsed.value);
    }

    await setDoc(root, { schema: 1, updatedAt: serverTimestamp() });
    this.state = { uid: this.uid, linked: true, cursors, shadow };
    saveState(this.state);
  }

  /** Escucha los cambios hechos en otros equipos desde el último visto. */
  private listen() {
    const root = this.root();
    const targets: Array<{ name: string; spec?: CollectionSpec }> = [...collectionSpecs.map((spec) => ({ name: spec.name, spec })), { name: "docs" }];
    return Promise.all(targets.map(({ name, spec }) => new Promise<void>((resolve) => {
      const since = Timestamp.fromMillis(Math.max(0, (this.state.cursors[name] ?? 0) - SAFETY_MS));
      const timeout = window.setTimeout(resolve, FIRST_SNAPSHOT_TIMEOUT_MS);
      const unsubscribe = onSnapshot(
        query(collection(root, name), where("updatedAt", ">", since)),
        (snapshot) => {
          if (spec) this.receiveCollection(spec, snapshot);
          else this.receiveDocs(snapshot);
          window.clearTimeout(timeout);
          resolve();
        },
        (error) => {
          window.clearTimeout(timeout);
          this.fail(error);
          resolve();
        },
      );
      this.unsubscribers.push(unsubscribe);
    })));
  }

  private bump(name: string, value: unknown) {
    const time = millis(value);
    if (time > (this.state.cursors[name] ?? 0)) this.state.cursors[name] = time;
  }

  private receiveCollection(spec: CollectionSpec, snapshot: QuerySnapshot) {
    const changes = snapshot.docChanges().filter((change) => change.type !== "removed" && !change.doc.metadata.hasPendingWrites);
    if (!changes.length) return;
    let items = readArray(spec.key);
    if (!items) return;
    const shadow = (this.state.shadow.collections[spec.name] ??= {});
    let changed = false;
    for (const change of changes) {
      const data = change.doc.data();
      this.bump(spec.name, data.updatedAt);
      const result = applyRemoteRecord(items, change.doc.id, toRecord(data), spec, shadow);
      items = result.items;
      changed ||= result.changed;
    }
    saveState(this.state);
    if (changed) writePersistentValue(spec.key, items);
    this.markSynced();
  }

  private receiveDocs(snapshot: QuerySnapshot) {
    const changes = snapshot.docChanges().filter((change) => change.type !== "removed" && !change.doc.metadata.hasPendingWrites);
    if (!changes.length) return;
    for (const change of changes) {
      const data = change.doc.data();
      this.bump("docs", data.updatedAt);
      const spec = docSpecs.find((item) => item.name === change.doc.id);
      const record = toRecord(data);
      if (!spec || record.deleted) continue;
      const parsed = parseJson(record.json);
      if (!parsed.ok) continue;
      const remoteHash = hashValue(parsed.value);
      const raw = readPersistentRaw(spec.key);
      const local = raw === null ? null : parseJson(raw);
      const localHash = local?.ok ? hashValue(local.value) : undefined;
      const known = this.state.shadow.docs[spec.name];
      // Cambio local aún sin subir: se conserva y se subirá.
      if (localHash !== undefined && known !== undefined && localHash !== known) continue;
      this.state.shadow.docs[spec.name] = remoteHash;
      if (localHash !== remoteHash) writePersistentValue(spec.key, parsed.value);
    }
    saveState(this.state);
    this.markSynced();
  }

  private onLocalChange = (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    const key = String(event.detail);
    if (specByKey.has(key)) this.schedule(key, PUSH_DELAY_MS);
  };

  private onConnection = () => {
    this.updatePhase();
  };

  private schedule(key: string, delay: number) {
    const previous = this.timers.get(key);
    if (previous !== undefined) window.clearTimeout(previous);
    this.timers.set(key, window.setTimeout(() => {
      this.timers.delete(key);
      void this.push(key);
    }, delay));
  }

  /** Sube lo que cambió en una clave respecto de lo último que coincidió con la nube. */
  private async push(key: string) {
    const spec = specByKey.get(key);
    if (this.stopped || !spec) return;
    const root = this.root();
    const writes: Array<{ ref: DocumentReference; data: DocumentData; apply: () => void }> = [];

    if (spec.kind === "collection") {
      const items = readArray(spec.key);
      if (!items) return;
      const shadow = (this.state.shadow.collections[spec.name] ??= {});
      const { upserts, removals } = diffCollection(items, spec, shadow);
      for (const item of upserts) writes.push({ ref: doc(root, spec.name, item.id), data: { json: item.json, deleted: false, updatedAt: serverTimestamp() }, apply: () => { shadow[item.id] = item.hash; } });
      for (const id of removals) writes.push({ ref: doc(root, spec.name, id), data: { json: "", deleted: true, updatedAt: serverTimestamp() }, apply: () => { delete shadow[id]; } });
    } else {
      const raw = readPersistentRaw(spec.key);
      if (raw === null) return;
      const parsed = parseJson(raw);
      if (!parsed.ok) return;
      const hash = hashValue(parsed.value);
      if (this.state.shadow.docs[spec.name] === hash) return;
      writes.push({ ref: doc(root, "docs", spec.name), data: { json: JSON.stringify(parsed.value), deleted: false, updatedAt: serverTimestamp() }, apply: () => { this.state.shadow.docs[spec.name] = hash; } });
    }
    if (!writes.length) return;

    this.pending++;
    this.updatePhase();
    try {
      for (let start = 0; start < writes.length; start += BATCH_SIZE) {
        const chunk = writes.slice(start, start + BATCH_SIZE);
        const batch = writeBatch(services().db);
        for (const write of chunk) batch.set(write.ref, write.data);
        await batch.commit();
        if (this.stopped) return;
        for (const write of chunk) write.apply();
        saveState(this.state);
      }
      this.pending--;
      this.markSynced();
    } catch (error) {
      this.pending--;
      this.fail(error);
    }
  }

  private updatePhase() {
    if (this.stopped) return;
    if (!online()) setCloudStatus({ phase: "offline" });
    else if (this.pending > 0) setCloudStatus({ phase: "syncing" });
    else this.markSynced();
  }

  private markSynced() {
    if (this.stopped || this.pending > 0) return;
    setCloudStatus(online() ? { phase: "synced", lastSyncedAt: Date.now(), message: null } : { phase: "offline" });
  }

  private fail(error: unknown) {
    if (this.stopped) return;
    setCloudStatus({ phase: "error", message: cloudErrorMessage(error) });
  }
}

// ─── API pública (se carga bajo demanda) ───────────────────────────────────

/** Arranca Firebase y sigue la sesión: al entrar se une y sincroniza; al salir se detiene. */
export function bootCloud() {
  if (booted) return;
  booted = true;
  onAuthStateChanged(services().auth, (user) => {
    if (user) {
      markSession(user);
      setCloudStatus({ user: toCloudUser(user) });
      if (session?.uid !== user.uid) {
        session?.stop();
        session = new Session(user.uid);
        void session.start();
      }
    } else {
      session?.stop();
      session = null;
      try {
        window.localStorage.removeItem(CLOUD_SESSION_KEY);
      } catch {
        // Nada que limpiar.
      }
      setCloudStatus({ phase: "off", user: null, lastSyncedAt: null, message: null });
    }
  });
}

export async function signInWithGoogle() {
  bootCloud();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(services().auth, provider);
}

export async function signInWithEmail(email: string, password: string) {
  bootCloud();
  await signInWithEmailAndPassword(services().auth, email.trim(), password);
}

export async function createAccount(email: string, password: string) {
  bootCloud();
  await createUserWithEmailAndPassword(services().auth, email.trim(), password);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(services().auth, email.trim());
}

/** Cierra la sesión. Los datos de este equipo se conservan; la nube queda como estaba. */
export async function signOutCloud() {
  session?.stop();
  session = null;
  clearLocalSession();
  await signOut(services().auth);
}

/**
 * Elimina la cuenta y todo lo guardado en la nube (pide confirmar la identidad). Los datos de este
 * equipo se conservan hasta que los borres desde Ajustes.
 */
export async function deleteCloudAccount(password?: string) {
  const { auth: currentAuth, db: firestore } = services();
  const user = currentAuth.currentUser;
  if (!user) return;
  if (toCloudUser(user).provider === "google") await reauthenticateWithPopup(user, new GoogleAuthProvider());
  else await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? "", password ?? ""));

  session?.stop();
  session = null;
  const root = doc(firestore, "users", user.uid);
  for (const name of [...collectionSpecs.map((spec) => spec.name), "docs"]) {
    const snapshot = await getDocs(collection(root, name));
    for (let start = 0; start < snapshot.docs.length; start += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      for (const item of snapshot.docs.slice(start, start + BATCH_SIZE)) batch.delete(item.ref);
      await batch.commit();
    }
  }
  await deleteDoc(root);
  clearLocalSession();
  await deleteUser(user);
}

/** Mensajes claros para los errores de Firebase más comunes. */
export function cloudErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/user-not-found": "No hay una cuenta con ese correo.",
    "auth/invalid-email": "Revisa el correo: no parece válido.",
    "auth/missing-password": "Escribe tu contraseña.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Entra con él.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos y prueba de nuevo.",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet y prueba de nuevo.",
    "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite ventanas emergentes o usa tu correo.",
    "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.",
    "auth/cancelled-popup-request": "Cerraste la ventana de Google antes de terminar.",
    "auth/operation-not-supported-in-this-environment": "Este navegador no permite entrar con Google aquí. Usa tu correo o abre PULSO en el navegador.",
    "auth/unauthorized-domain": "Este sitio aún no está autorizado para entrar con Google.",
    "auth/requires-recent-login": "Por seguridad, vuelve a entrar y repite la acción.",
    "auth/user-mismatch": "Elige la misma cuenta con la que entraste.",
    "permission-denied": "La nube rechazó el acceso a tus datos. Cierra sesión y vuelve a entrar.",
    unavailable: "La nube no responde. Se reintentará al volver la conexión.",
  };
  return messages[code] ?? "No se pudo completar. Prueba de nuevo en un momento.";
}
