import { buildPushPayload } from "@block65/webcrypto-web-push";
import { VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "@/lib/push-config";
import { defaultPushPrefs, dueReminders, localClock, parseTime, validTimeZone, type PushPrefs, type PushState } from "@/lib/reminders";

/**
 * Avisos en el Worker: guarda las suscripciones de los teléfonos en D1 y cada 15 minutos envía los
 * que tocan según la hora local de cada persona. Sin cuenta: la suscripción misma (su dirección,
 * que sólo conoce ese teléfono) identifica al dispositivo.
 */

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<{ meta?: { changes?: number } }>;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
}
interface D1Like { prepare(sql: string): D1Statement }
export interface PushEnv { PUSH_DB: D1Like; VAPID_PRIVATE_KEY: string }

interface Row { id: string; endpoint: string; p256dh: string; auth: string; tz: string; prefs: string; state: string | null; sent: string }
interface Notice { title: string; body: string; url: string; tag: string }

const SCHEMA = "CREATE TABLE IF NOT EXISTS push_subscriptions (id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, tz TEXT NOT NULL, prefs TEXT NOT NULL, state TEXT, sent TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)";
let schemaReady: Promise<unknown> | null = null;
const ensureSchema = (db: D1Like) => (schemaReady ??= db.prepare(SCHEMA).run().catch((error: unknown) => {
  schemaReady = null;
  throw error;
}));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const parse = <T>(text: string | null, fallback: T): T => {
  try {
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
};
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const base64url = (value: unknown, min: number, max: number) => typeof value === "string" && value.length >= min && value.length <= max && /^[A-Za-z0-9_-]+=*$/.test(value);

async function idFor(endpoint: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1024) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizePrefs(value: unknown): PushPrefs {
  const input = isRecord(value) ? value : {};
  const flag = (key: keyof PushPrefs) => (typeof input[key] === "boolean" ? (input[key] as boolean) : (defaultPushPrefs[key] as boolean));
  const time = typeof input.trainingTime === "string" && parseTime(input.trainingTime) !== null ? input.trainingTime : defaultPushPrefs.trainingTime;
  return { training: flag("training"), trainingTime: time, streak: flag("streak"), meals: flag("meals"), water: flag("water"), breaks: flag("breaks") };
}

export function sanitizeState(value: unknown): PushState | null {
  if (!isRecord(value)) return null;
  const date = (key: string) => (typeof value[key] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value[key] as string) ? (value[key] as string) : null);
  const count = (key: string, max: number) => Math.max(0, Math.min(max, Math.round(Number(value[key]) || 0)));
  const day = date("date");
  const weekStart = date("weekStart");
  if (!day || !weekStart) return null;
  return {
    date: day,
    weekStart,
    trainedToday: value.trainedToday === true,
    weekSessions: count("weekSessions", 21),
    weekGoal: Math.max(1, count("weekGoal", 14)),
    streak: count("streak", 520),
    counting: value.counting === true,
    loggedToday: value.loggedToday === true,
    loggedEvening: value.loggedEvening === true,
    water: count("water", 30),
    waterGoal: Math.max(1, count("waterGoal", 30)),
    breaksToday: count("breaksToday", 20),
    trainingDays: Array.isArray(value.trainingDays) ? [...new Set(value.trainingDays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b) : [],
  };
}

async function send(env: PushEnv, row: Pick<Row, "endpoint" | "p256dh" | "auth">, notice: Notice) {
  const payload = await buildPushPayload(
    { data: JSON.stringify(notice), options: { ttl: 3600, urgency: "normal", topic: notice.tag } },
    { endpoint: row.endpoint, expirationTime: null, keys: { p256dh: row.p256dh, auth: row.auth } },
    { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY },
  );
  const response = await fetch(row.endpoint, payload);
  return response.status;
}

/** /api/push/subscribe, /state, /unsubscribe y /test (sólo POST desde la propia app). */
export async function handlePushRequest(request: Request, env: PushEnv): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "POST") return json({ error: "method" }, 405);
  if (request.headers.get("origin") !== url.origin) return json({ error: "origin" }, 403);
  const text = await request.text();
  if (text.length > 4096) return json({ error: "size" }, 413);
  const body = parse<unknown>(text, null);
  if (!isRecord(body)) return json({ error: "body" }, 400);
  const db = env.PUSH_DB;
  await ensureSchema(db);
  const now = new Date().toISOString();

  if (url.pathname === "/api/push/subscribe") {
    const subscription = isRecord(body.subscription) ? body.subscription : null;
    const keys = subscription && isRecord(subscription.keys) ? subscription.keys : null;
    const tz = typeof body.tz === "string" && validTimeZone(body.tz) ? body.tz : null;
    if (!subscription || !validEndpoint(subscription.endpoint) || !keys || !base64url(keys.p256dh, 80, 100) || !base64url(keys.auth, 16, 32) || !tz) return json({ error: "subscription" }, 400);
    const id = await idFor(subscription.endpoint);
    const state = sanitizeState(body.state);
    await db.prepare(
      "INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, tz, prefs, state, sent, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, ?) ON CONFLICT(id) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, tz = excluded.tz, prefs = excluded.prefs, state = COALESCE(excluded.state, push_subscriptions.state), updated_at = excluded.updated_at",
    ).bind(id, subscription.endpoint, keys.p256dh, keys.auth, tz, JSON.stringify(sanitizePrefs(body.prefs)), state ? JSON.stringify(state) : null, now, now).run();
    return json({ ok: true });
  }

  if (!validEndpoint(body.endpoint)) return json({ error: "endpoint" }, 400);
  const id = await idFor(body.endpoint);

  if (url.pathname === "/api/push/state") {
    const state = sanitizeState(body.state);
    const tz = typeof body.tz === "string" && validTimeZone(body.tz) ? body.tz : null;
    const result = await db.prepare("UPDATE push_subscriptions SET prefs = ?, state = COALESCE(?, state), tz = COALESCE(?, tz), updated_at = ? WHERE id = ?")
      .bind(JSON.stringify(sanitizePrefs(body.prefs)), state ? JSON.stringify(state) : null, tz, now, id).run();
    return (result.meta?.changes ?? 0) > 0 ? json({ ok: true }) : json({ error: "missing" }, 404);
  }

  if (url.pathname === "/api/push/unsubscribe") {
    await db.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  if (url.pathname === "/api/push/test") {
    const row = await db.prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE id = ?").bind(id).first<Pick<Row, "endpoint" | "p256dh" | "auth">>();
    if (!row) return json({ error: "missing" }, 404);
    const status = await send(env, row, { title: "Así se ven tus avisos", body: "Te avisaremos a tu hora. Sin excusas.", url: "/", tag: "test" });
    if (status === 404 || status === 410) await db.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(id).run();
    return json({ ok: status >= 200 && status < 300, status }, status >= 200 && status < 300 ? 200 : 502);
  }

  return json({ error: "not-found" }, 404);
}

/** Tarea programada: envía a cada suscripción el aviso que le toque ahora (a lo más uno). */
export async function runReminders(env: PushEnv, now = new Date()) {
  const db = env.PUSH_DB;
  await ensureSchema(db);
  const { results } = await db.prepare("SELECT id, endpoint, p256dh, auth, tz, prefs, state, sent FROM push_subscriptions").all<Row>();
  let sent = 0;
  await Promise.all(results.map(async (row) => {
    const already = parse<Record<string, string>>(row.sent, {});
    const { send: reminder, skip } = dueReminders({ prefs: sanitizePrefs(parse(row.prefs, null)), state: sanitizeState(parse(row.state, null)), sent: already, timeZone: row.tz, now });
    if (!reminder) return;
    const today = localClock(now, row.tz).date;
    // Sólo se guarda lo de hoy: así el registro de envíos no crece.
    const next: Record<string, string> = Object.fromEntries(Object.entries(already).filter(([, day]) => day === today));
    for (const kind of [reminder.kind, ...skip]) next[kind] = today;
    try {
      const status = await send(env, row, { ...reminder, tag: reminder.kind });
      if (status === 404 || status === 410) {
        await db.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(row.id).run();
        return;
      }
      if (status >= 200 && status < 300) sent += 1;
    } catch {
      // Un envío fallido no frena a los demás; se marca igual para no insistir cada 15 minutos.
    }
    await db.prepare("UPDATE push_subscriptions SET sent = ? WHERE id = ?").bind(JSON.stringify(next), row.id).run();
  }));
  return { checked: results.length, sent };
}
